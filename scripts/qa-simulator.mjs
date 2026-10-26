// Capturas de cada etapa do simulador (caminho data center e caminho físico)
// para revisão visual. Uso: node scripts/qa-simulator.mjs [url] [largura]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:4321/';
const width = Number(process.argv[3] ?? 1440);
const outDir = fileURLToPath(new URL('../reports/screenshots/', import.meta.url));
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
await page.goto(url, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: '.site-header{position:relative!important}.skip-link,.wa-fab{display:none!important}' });
const sim = page.locator('[data-simulator]');
const shot = async (name) => {
  await sim.scrollIntoViewIfNeeded();
  await sim.screenshot({ path: `${outDir}sim-${width}-${name}.png` });
};
const choose = (title) => sim.locator('.opt', { has: page.locator('.opt-title', { hasText: title }) }).first().locator('input').check();
const next = () => sim.locator(width < 1180 ? '[data-next-mobile]' : '[data-next]').click();

await choose('Banco de dados');
await choose('Virtualização');
await next();
await choose('Servidor dedicado em data center');
await shot('2-modalidade');
await next();
await choose('2× Intel Xeon Gold 6134');
await shot('3-processador-dc');
await next();
await choose('32 GB');
await shot('4-memoria-dc');
await next();
await choose('2 × 1 TB NVMe');
await shot('5-discos-dc');
await next();
await choose('VPN com o escritório');
await shot('6-servicos-dc');
if (width < 768) for (let i = 0; i < 4; i++) await sim.locator('[data-prev]').click();
else await sim.locator('[data-goto="1"]').click();
await choose('Comprar servidor físico');
await choose('Rack');
await next();
await choose('Intel Xeon E5 v3/v4');
await shot('3-processador-fisico');
await next();
await choose('64 GB');
await shot('4-memoria-fisico');
await next();
await choose('SSD + HDD');
await choose('4 a 10 TB');
await next();
await next();
await shot('7-envio');
await sim.locator('[data-submit]').click();
await shot('7-envio-erros');
await browser.close();
console.log('ok');
