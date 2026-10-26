// Captura a página em várias larguras para revisão visual e verifica rolagem
// horizontal e erros de console. Uso: node scripts/qa-screenshots.mjs [url] [larguras]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:4321/';
const widths = (process.argv[3] ?? '360,390,768,1024,1440,1920').split(',').map(Number);
const sections = ['.site-header', '#inicio', '.clients', '#aplicacoes', '#modalidades', '#diferenciais', '#simulador', '#equipamentos', '#processo', '#clientes', '#duvidas', '.final', '.footer'];
const outDir = fileURLToPath(new URL('../reports/screenshots/', import.meta.url));
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const report = [];
for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const offenders = [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.right > doc.clientWidth + 1 && getComputedStyle(el).position !== 'fixed';
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, offenders };
  });

  await page.screenshot({ path: `${outDir}${width}-full.png`, fullPage: true });
  // Nas capturas por seção, elementos fixos poluiriam a imagem.
  await page.addStyleTag({ content: '.site-header{position:relative!important}.skip-link,.wa-fab{display:none!important}' });
  for (const sel of sections) {
    const el = page.locator(sel).first();
    if (await el.count()) {
      await el.scrollIntoViewIfNeeded();
      await el.screenshot({ path: `${outDir}${width}-${sel.replace(/[#.]/g, '')}.png` });
    }
  }
  report.push({ width, overflow, errors });
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
