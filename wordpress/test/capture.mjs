// Captura a página inteira em várias larguras para o teste de fidelidade.
// Uso: node wordpress/test/capture.mjs <url> <rótulo> [larguras]
// Saída: reports/fidelity/<rótulo>/<largura>.png + metrics.json
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const [url, label, list] = process.argv.slice(2);
if (!url || !label) throw new Error('Uso: node wordpress/test/capture.mjs <url> <rótulo> [larguras]');
const widths = (list ?? '360,390,768,1024,1440,1920').split(',').map(Number);
const out = fileURLToPath(new URL(`../../reports/fidelity/${label}/`, import.meta.url));
await mkdir(out, { recursive: true });

// Rastreamento real nunca é disparado durante os testes.
const BLOCKED = /googletagmanager\.com|google-analytics\.com|googleadservices\.com|doubleclick\.net|facebook\.(com|net)|clarity\.ms|leadster\.com\.br|youtube/;

const browser = await chromium.launch();
const metrics = {};
for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  await ctx.route(BLOCKED, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !/ERR_FAILED|blocked/i.test(m.text()) && errors.push(m.text()));
  const failed = [];
  page.on('requestfailed', (r) => !BLOCKED.test(r.url()) && failed.push(r.url()));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  // Percorre a página para carregar imagens lazy e volta ao topo.
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => (img.onload = img.onerror = r)))));
  });
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).sort(),
    stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href')),
    brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
    simulatorReady: document.querySelector('[data-simulator]')?.classList.contains('is-ready') ?? false,
  }));
  await page.screenshot({ path: `${out}${width}.png`, fullPage: true });
  metrics[width] = { ...info, errors, failedRequests: failed };
  await ctx.close();
}
await browser.close();
await writeFile(`${out}metrics.json`, JSON.stringify(metrics, null, 2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(metrics).map(([w, m]) => [w, { height: m.height, scrollWidth: m.scrollWidth, fonts: m.fonts.length, broken: m.brokenImages.length, errors: m.errors.length, failed: m.failedRequests.length, sim: m.simulatorReady }])), null, 1));
