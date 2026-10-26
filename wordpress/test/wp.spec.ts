import { expect, test, type Page } from '@playwright/test';
import { completePhysicalPurchase, gotoLanding, LANDING_PATH, openSimulator, sim } from '../../tests/e2e/helpers';

// Testes específicos da integração com WordPress (ambiente local de npm run wp:dev).
// O PHP do Playground roda em WebAssembly: telas do wp-admin são lentas.
test.describe.configure({ mode: 'serial', timeout: 120_000 });
test.skip(({ baseURL }) => !baseURL?.includes('9400') && !process.env.WP_URL, 'somente contra o WordPress local');

const util = async (page: Page, params: Record<string, string>) => {
  const res = await page.request.get(`/wp-admin/admin-ajax.php?${new URLSearchParams({ action: 'msslp_test', ...params })}`);
  return res.json();
};

// Usuário padrão do WordPress Playground (ambiente local de teste). O login é
// feito por requisição HTTP no mesmo contexto do navegador (cookies compartilhados),
// que é determinístico; a tela de configurações é então aberta e conferida.
async function loginAdmin(page: Page) {
  await page.request.get('/wp-login.php'); // define o cookie de teste do WordPress
  const res = await page.request.post('/wp-login.php', {
    form: { log: 'admin', pwd: 'password', testcookie: '1', redirect_to: '/wp-admin/options-general.php?page=msslp' },
    maxRedirects: 0,
  });
  expect(res.status(), 'login do administrador local').toBe(302);
  await page.goto('/wp-admin/options-general.php?page=msslp', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Landing Servidores Dedicados' })).toBeVisible();
}

async function fillContact(page: Page, name = 'Teste Integração') {
  await sim(page).locator('[data-field="name"]').fill(name);
  await sim(page).locator('[data-field="company"]').fill('Empresa Teste');
  await sim(page).locator('[data-field="email"]').fill('teste@empresa-teste.com.br');
  await sim(page).locator('[data-field="phone"]').pressSequentially('11987654321');
}

test.afterAll(async ({ request }) => {
  await request.get('/wp-admin/admin-ajax.php?action=msslp_test&cmd=set_mode&mode=live');
});

test('a landing substitui a página sem herdar CSS do tema ou de plugins', async ({ page }) => {
  await util(page, { cmd: 'set_mode', mode: 'live' });
  const failed: string[] = [];
  page.on('response', (r) => r.url().includes('/wp-content/plugins/msserver-landing-servidores/') && r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));
  const res = await page.goto(LANDING_PATH);
  expect(res?.headers()['x-msserver-landing']).toBe(`1.0.0; live`);
  expect(await page.locator('link[rel="stylesheet"]').count()).toBe(0);
  expect(await page.locator('#tema-hostil-inline-css, style:has-text("Times New Roman")').count()).toBe(0);
  const styles = await page.evaluate(() => ({
    font: getComputedStyle(document.body).fontFamily,
    bg: getComputedStyle(document.body).backgroundColor,
    h1: getComputedStyle(document.querySelector('h1')!).color,
  }));
  expect(styles.font).toMatch(/^"?Inter Variable/);
  expect(styles.bg).toBe('rgb(245, 244, 240)');
  expect(styles.h1).toBe('rgb(27, 24, 32)');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForLoadState('networkidle');
  expect(failed).toEqual([]);
});

test('o rastreamento do site é repassado e o restante fica de fora', async ({ page }) => {
  await gotoLanding(page);
  const html = await page.content();
  expect(html).toContain("'GTM-TESTE00'");
  expect(html).toContain('googletagmanager.com/ns.html?id=GTM-TESTE00');
  expect(html).toContain("fbq('init', '000000000000000')");
  expect(html).toContain('"teste00000"');
  expect(html).toContain('gtag/js?id=AW-000000000');
  expect(html).toContain('function gtag_report_conversion');
  expect(html).not.toContain('__scriptQueNaoEhRastreamento');
  expect(html).not.toContain('__leadsterCarregado');
  expect(html).not.toContain('__clickToChat');
  // No HTML entregue pelo servidor, o GTM noscript fica logo depois de <body>.
  const served = await (await page.request.get(LANDING_PATH)).text();
  expect(served).toMatch(/<body[^>]*>\s*<noscript><iframe src="https:\/\/www\.googletagmanager\.com\/ns\.html\?id=GTM-TESTE00/);
  // Os eventos do simulador chegam ao mesmo dataLayer usado pelo GTM/gtag do site.
  await openSimulator(page);
  const events = await page.evaluate(() => (window.dataLayer ?? []).map((e) => (e as { event?: string }).event).filter(Boolean));
  expect(events).toContain('gtm.js');
});

test('envio real usa o formulário Elementor com o contrato esperado', async ({ page }) => {
  await util(page, { cmd: 'reset_log' });
  await openSimulator(page);
  await completePhysicalPurchase(page);
  await fillContact(page);
  await sim(page).locator('[data-submit]').click();
  await expect(sim(page).locator('.sim-success h4')).toHaveText('Solicitação enviada');
  await expect(sim(page).locator('.sim-success')).toContainText('Recebido pelo Elementor simulado');
  const { submissions } = await util(page, { cmd: 'status' });
  expect(submissions).toHaveLength(1);
  const lead = submissions[0];
  expect(lead.name).toBe('Teste Integração');
  expect(lead.field_2e1002c).toBe('(11)98765-4321');
  expect(lead.field_f66ed12).toBe('teste@empresa-teste.com.br');
  expect(lead.field_1d74bd8).toMatch(/^\[Simulador · Servidores dedicados\] Uso: Virtualização, Banco de dados \| Modalidade: Compra · Rack/);
  expect(lead.field_9919f95).toBe('A definir');
});

test('animações e efeitos de rolagem funcionam no WordPress', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await gotoLanding(page);
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  expect(running).toBeGreaterThan(0); // LEDs e traço da ilustração do hero
  const target = page.locator('#diferenciais [data-reveal]').first();
  await expect(target).not.toHaveClass(/is-in/);
  await target.scrollIntoViewIfNeeded();
  await expect(target).toHaveClass(/is-in/);
  await expect(page.locator('.site-header')).toHaveClass(/is-scrolled/);
});

test('modo prévia: visitante vê a página original e o administrador vê a landing', async ({ page, browser }) => {
  await util(page, { cmd: 'set_mode', mode: 'preview' });
  const visitor = await browser.newPage();
  await visitor.goto(`${LANDING_PATH}?msslp=preview`);
  await expect(visitor.getByText('Página original da campanha (Elementor)')).toBeVisible();
  await expect(visitor.locator('[data-simulator]')).toHaveCount(0);
  await visitor.close();

  await loginAdmin(page);
  const res = await page.goto(`${LANDING_PATH}?msslp=preview`);
  expect(res?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.locator('[data-simulator]')).toHaveClass(/is-ready/);
});

test('envio na prévia responde como teste e não chega ao formulário', async ({ page }) => {
  await util(page, { cmd: 'set_mode', mode: 'preview' });
  await util(page, { cmd: 'reset_log' });
  await loginAdmin(page);
  await page.route(/googletagmanager|facebook|clarity/, (r) => r.abort());
  await page.goto(`${LANDING_PATH}?msslp=preview`);
  await page.getByRole('link', { name: 'Simular meu servidor' }).first().click();
  await completePhysicalPurchase(page);
  await fillContact(page);
  await sim(page).locator('[data-submit]').click();
  await expect(sim(page).locator('.sim-success')).toContainText('Envio de teste da prévia');
  const { submissions } = await util(page, { cmd: 'status' });
  expect(submissions).toHaveLength(0);
});

test('configurações: desativar devolve a página original (reversão)', async ({ page, browser }) => {
  await util(page, { cmd: 'set_mode', mode: 'live' });
  await loginAdmin(page);
  await page.goto('/wp-admin/options-general.php?page=msslp');
  await expect(page.getByRole('heading', { name: 'Landing Servidores Dedicados' })).toBeVisible();
  // Administrador pode comparar com a página antiga mesmo com a landing no ar.
  await page.goto(`${LANDING_PATH}?msslp=original`);
  await expect(page.getByText('Página original da campanha (Elementor)')).toBeVisible();

  await page.goto('/wp-admin/options-general.php?page=msslp');
  await page.locator('input[name="msslp_settings[mode]"][value="off"]').check();
  await page.locator('#submit').click();
  await expect(page.locator('#setting-error-settings_updated, .notice-success')).toBeVisible();

  const visitor = await browser.newPage();
  await visitor.goto(LANDING_PATH);
  await expect(visitor.getByText('Página original da campanha (Elementor)')).toBeVisible();
  await visitor.close();

  await page.goto('/wp-admin/options-general.php?page=msslp');
  await page.locator('input[name="msslp_settings[mode]"][value="live"]').check();
  await page.locator('#submit').click();
  const back = await browser.newPage();
  await back.goto(LANDING_PATH);
  await expect(back.locator('[data-simulator]')).toHaveClass(/is-ready/);
  await back.close();
});
