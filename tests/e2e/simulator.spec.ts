import { expect, test } from '@playwright/test';
import { choose, completePhysicalPurchase, dataLayer, expectStep, gotoLanding, next, openSimulator, sim, SUCCESS_TEXT, summaryValue } from './helpers';

test.describe('simulador', () => {
  test('compra de ponta a ponta, com validação e envio confirmado', async ({ page }) => {
    const errors = await openSimulator(page);

    // Não avança sem escolha.
    await next(page);
    await expect(sim(page).locator('[data-error]')).toContainText('pelo menos um uso');

    await completePhysicalPurchase(page);

    // Resumo e referência de preço refletem as escolhas.
    const review = sim(page).locator('.sim-review');
    await expect(review).toContainText('Virtualização, Banco de dados');
    await expect(review).toContainText('Compra · Rack');
    await expect(review).toContainText('Intel Xeon Scalable');
    await expect(review).toContainText('64 GB');
    await expect(review).toContainText('SSD · 1 a 4 TB');
    if ((page.viewportSize()?.width ?? 0) >= 1180) {
      await expect(sim(page).locator('[data-price]')).toContainText('Referência publicada');
      await expect(sim(page).locator('[data-price] .price-from')).toContainText('R$');
    }

    // Erros de formulário claros.
    await sim(page).locator('[data-submit]').click();
    await expect(sim(page).locator('[data-form-errors]')).toContainText('Confira 4 campos');
    await expect(sim(page).locator('[data-field="name"]')).toBeFocused();

    await sim(page).locator('[data-field="name"]').fill('Ana Teste');
    await sim(page).locator('[data-field="company"]').fill('Empresa Teste Ltda');
    await sim(page).locator('[data-field="email"]').fill('ana@empresa-teste.com.br');
    await sim(page).locator('[data-field="phone"]').pressSequentially('11987654321');
    await expect(sim(page).locator('[data-field="phone"]')).toHaveValue('(11) 98765-4321');

    await sim(page).locator('[data-submit]').click();
    await expect(sim(page).locator('[data-submit-label]')).toHaveText('Enviando…');
    await expect(sim(page).locator('.sim-success h4')).toHaveText('Solicitação enviada');
    await expect(sim(page).locator('.sim-success')).toContainText(SUCCESS_TEXT);
    // Depois do envio, as etapas anteriores ficam travadas até uma nova simulação.
    await expect(sim(page).locator('[data-goto="0"]')).toBeDisabled();
    await expect(page.evaluate(() => sessionStorage.getItem('msserver-simulador-v1'))).resolves.toBeNull();

    // Eventos: conversão só após confirmação, sem dados pessoais no dataLayer.
    const events = await dataLayer(page);
    const names = events.map((e) => e.event);
    expect(names).toContain('simulation_start');
    expect(names.filter((n) => n === 'simulation_step_complete')).toHaveLength(6);
    expect(names).toContain('simulation_complete');
    expect(names.filter((n) => n === 'quote_request_submit')).toHaveLength(1);
    expect(JSON.stringify(events)).not.toMatch(/Ana Teste|ana@empresa|98765/);

    expect(errors).toEqual([]);
  });

  test('voltar mantém escolhas e trocar de caminho reinicia o hardware', async ({ page }) => {
    await openSimulator(page);
    await choose(page, 'Sistemas de gestão e ERP');
    await next(page);
    await choose(page, 'Comprar servidor físico');
    await choose(page, 'Torre');
    await next(page);
    await choose(page, 'Intel Xeon E5 v3/v4');
    await next(page);
    await expectStep(page, 'Quanta memória RAM?');

    await sim(page).locator('[data-prev]').click();
    await expectStep(page, 'Qual processamento você precisa?');
    await expect(sim(page).locator('.opt', { hasText: 'Intel Xeon E5 v3/v4' }).locator('input')).toBeChecked();

    await sim(page).locator('[data-prev]').click();
    await choose(page, 'Servidor dedicado em data center');
    await expect(sim(page).locator('[data-notices]')).toContainText('reiniciadas');
    await expect(sim(page).locator('fieldset', { hasText: 'Formato do servidor' })).toBeHidden();
    await next(page);

    // Catálogo do data center, com especificações corrigidas.
    await expect(sim(page).locator('.opt', { hasText: '2× Intel Xeon Gold 6138' })).toContainText('40 núcleos · 80 threads');
    await choose(page, '1× Intel Xeon E3-1200');
    await next(page);
    await choose(page, '64 GB');
    await expect(sim(page).locator('[data-warnings]')).toContainText('E3-1200 suporta até 32 GB');
    await next(page);

    await choose(page, '2 × 1 TB NVMe');
    await expect(sim(page).locator('[data-warnings]')).toContainText('NVMe');
    await next(page);
    await expectStep(page, 'Serviços e detalhes finais');
    await expect(sim(page).locator('.opt', { hasText: 'VPN com o escritório' })).toBeVisible();
    await expect(sim(page).locator('.opt', { hasText: 'Extensão de garantia' })).toHaveCount(0);
    await next(page);
    await expect(sim(page).locator('.sim-review')).toContainText('1 IP');
  });

  test('falha no envio mantém os dados e oferece alternativas reais', async ({ page }) => {
    await openSimulator(page);
    await completePhysicalPurchase(page);
    await sim(page).locator('[data-field="name"]').fill('Teste falha');
    await sim(page).locator('[data-field="company"]').fill('Empresa');
    await sim(page).locator('[data-field="email"]').fill('teste@empresa.com.br');
    await sim(page).locator('[data-field="phone"]').fill('11987654321');
    await sim(page).locator('[data-submit]').click();

    const failure = sim(page).locator('.sim-send-error');
    await expect(failure).toContainText('Não conseguimos confirmar o envio');
    await expect(sim(page).locator('[data-field="email"]')).toHaveValue('teste@empresa.com.br');
    const wa = failure.getByRole('link', { name: 'Enviar pelo WhatsApp' });
    await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/5511985991837\?text=.*Mem%C3%B3ria%3A%2064%20GB/);
    await expect(failure.getByRole('link', { name: 'Enviar por e-mail' })).toHaveAttribute('href', /^mailto:comercial@msserver\.com\.br/);
    expect((await dataLayer(page)).some((e) => e.event === 'quote_request_submit')).toBe(false);
  });

  test('atalhos da página pré-configuram o simulador', async ({ page }) => {
    await gotoLanding(page);
    await page.locator('[data-sim-preset="workload:database"]').click();
    await expect(sim(page).locator('.opt', { hasText: 'Banco de dados' }).locator('input')).toBeChecked();

    await page.locator('[data-sim-preset="model:servidor-dell-r740"]').click();
    await expect(sim(page).locator('[data-notices]')).toContainText('Partimos do Dell PowerEdge R740');
    await expectStep(page, 'Quanta memória RAM?');
    await expect(sim(page).locator('.opt', { hasText: /^128 GB/ })).toContainText('com preço');
  });

  test('atalho que troca de caminho mostra o aviso de reinício', async ({ page }) => {
    await openSimulator(page);
    await choose(page, 'Aplicações e sites');
    await next(page);
    await choose(page, 'Servidor dedicado em data center');
    await next(page);
    await choose(page, '2× Intel Xeon Gold 6134');
    await page.locator('[data-sim-preset="model:servidor-dell-t630"]').click();
    const notices = sim(page).locator('[data-notices]');
    await expect(notices).toContainText('reiniciadas');
    await expect(notices).toContainText('Partimos do Dell PowerEdge T630');
  });

  test('a configuração sobrevive a um recarregamento da página', async ({ page }) => {
    await openSimulator(page);
    await choose(page, 'Arquivos e backup');
    await next(page);
    await choose(page, 'Alugar servidor físico');
    await page.reload();
    await expect(sim(page).locator('[data-notices]')).toContainText('Retomamos a simulação');
    await expect(sim(page).locator('.opt', { hasText: 'Alugar servidor físico' }).locator('input')).toBeChecked();
  });

  test('funciona pelo teclado', async ({ page }) => {
    await openSimulator(page);
    const first = sim(page).locator('.opt input').first();
    await first.focus();
    await page.keyboard.press('Space');
    await expect(first).toBeChecked();
    await expect(summaryValue(page, 'Uso')).toHaveText('Sistemas de gestão e ERP');
    await next(page);
    const radio = sim(page).locator('.opt input[type="radio"]').first();
    await radio.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await expect(sim(page).locator('.opt input[type="radio"]').nth(1)).toBeChecked();
  });
});

test.describe('celular', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1440) >= 1180, 'somente telas pequenas');

  test('barra fixa e resumo em folha inferior', async ({ page }) => {
    await openSimulator(page);
    await choose(page, 'Virtualização');
    await expect(sim(page).locator('[data-mobile-count]')).toHaveText('1 de 5');
    await sim(page).locator('[data-open-sheet]').click();
    const sheet = page.getByRole('dialog', { name: 'Sua configuração' });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('Virtualização');
    await sheet.getByRole('button', { name: 'Fechar resumo' }).click();
    await expect(sheet).toBeHidden();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });

  test('menu móvel abre e fecha', async ({ page }) => {
    await gotoLanding(page);
    const toggle = page.getByRole('button', { name: 'Abrir menu' });
    await toggle.click();
    await expect(page.locator('#menu-movel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#menu-movel')).toBeHidden();
    await toggle.click();
    await page.locator('#menu-movel').getByRole('link', { name: /Dúvidas/ }).click();
    await expect(page.locator('#menu-movel')).toBeHidden();
  });
});
