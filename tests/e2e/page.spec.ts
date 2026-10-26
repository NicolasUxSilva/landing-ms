import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { completePhysicalPurchase, gotoLanding, openSimulator } from './helpers';

test('metadados de SEO preservam a intenção de busca', async ({ page }) => {
  await gotoLanding(page);
  await expect(page).toHaveTitle(/Servidores Dedicados para Empresas/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://msserver.com.br/servidores-dedicados-para-empresas/');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /servidores dedicados/i);
  await expect(page.locator('h1')).toHaveCount(1);
  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  const parsed = JSON.parse(ld ?? '[]');
  expect(parsed.map((x: { '@type': string }) => x['@type'])).toEqual(['Organization', 'FAQPage']);
});

test('links internos apontam para seções existentes', async ({ page }) => {
  await gotoLanding(page);
  const hashes = await page.$$eval('a[href^="#"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')!))]);
  for (const h of hashes) {
    expect(await page.locator(h).count(), `destino de ${h}`).toBeGreaterThan(0);
  }
  const wa = await page.$$eval('a[href*="wa.me"]', (as) => as.map((a) => a.getAttribute('href')!));
  expect(wa.length).toBeGreaterThan(3);
  for (const href of wa) expect(href).toMatch(/^https:\/\/wa\.me\/5511985991837/);
});

test('sem violações de acessibilidade (axe, WCAG A/AA) na página', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoLanding(page);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
});

test('sem violações de acessibilidade na etapa de envio', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openSimulator(page);
  await completePhysicalPurchase(page);
  const results = await new AxeBuilder({ page }).include('[data-simulator]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
});
