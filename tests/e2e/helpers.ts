import { expect, type Page } from '@playwright/test';

export const sim = (page: Page) => page.locator('[data-simulator]');

// Caminho da landing (permite rodar a mesma suíte contra o WordPress local).
export const LANDING_PATH = process.env.E2E_PATH ?? '/';
export const SUCCESS_TEXT = process.env.E2E_SUCCESS_TEXT ?? 'Nenhum dado foi enviado à MSSERVER';
const TRACKERS = /googletagmanager\.com|google-analytics\.com|facebook\.(com|net)|clarity\.ms|leadster/;

export async function gotoLanding(page: Page) {
  await page.route(TRACKERS, (r) => r.abort());
  await page.goto(LANDING_PATH);
}

export async function openSimulator(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !TRACKERS.test(m.location().url) && !/ERR_FAILED/.test(m.text()) && errors.push(m.text()));
  await gotoLanding(page);
  await page.getByRole('link', { name: 'Simular meu servidor' }).first().click();
  await expect(sim(page).locator('.sim-step-title')).toHaveText('Para que o servidor vai ser usado?');
  return errors;
}

/** Seleciona uma opção pelo título do cartão. */
export async function choose(page: Page, title: string) {
  const option = sim(page).locator('.opt', { has: page.locator('.opt-title', { hasText: new RegExp(`^${escape(title)}$`) }) }).first();
  await option.locator('input').check();
}

export async function next(page: Page) {
  const mobile = (page.viewportSize()?.width ?? 1440) < 1180;
  await sim(page).locator(mobile ? '[data-next-mobile]' : '[data-next]').click();
}

export async function expectStep(page: Page, title: string) {
  await expect(sim(page).locator('.sim-step-title')).toHaveText(title);
}

export const summaryValue = (page: Page, label: string) =>
  sim(page).locator('[data-summary-list] .sum-row', { has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) }).locator('.sum-value');

export async function dataLayer(page: Page) {
  return page.evaluate(() => (window.dataLayer ?? []).map((e) => ({ ...e })));
}

/** Percorre o caminho de compra até a etapa de envio. */
export async function completePhysicalPurchase(page: Page) {
  await choose(page, 'Virtualização');
  await choose(page, 'Banco de dados');
  await next(page);
  await expectStep(page, 'Como você prefere contratar?');
  await choose(page, 'Comprar servidor físico');
  await choose(page, 'Rack');
  await next(page);
  await expectStep(page, 'Qual processamento você precisa?');
  await choose(page, 'Intel Xeon Scalable');
  await next(page);
  await expectStep(page, 'Quanta memória RAM?');
  await choose(page, '64 GB');
  await next(page);
  await expectStep(page, 'Como deve ser o armazenamento?');
  await choose(page, 'SSD');
  await choose(page, '1 a 4 TB');
  await next(page);
  await expectStep(page, 'Serviços e detalhes finais');
  await choose(page, 'Extensão de garantia');
  await next(page);
  await expectStep(page, 'Revise e envie para um especialista');
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
