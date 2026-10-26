// Gera public/og-servidores-dedicados.jpg (1200×630) para compartilhamento.
// Requer o servidor de desenvolvimento rodando (usa a ilustração da página).
// Uso: node scripts/make-og.mjs [url-dev]
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const dev = process.argv[2] ?? 'http://localhost:4321/';
const html = await (await fetch(dev)).text();
const svg = html.match(/<svg class="server-illustration[\s\S]*?<\/svg>/)?.[0];
if (!svg) throw new Error('Ilustração não encontrada na página.');

const font = async (p) => `data:font/woff2;base64,${(await readFile(path.join(ROOT, 'node_modules', p))).toString('base64')}`;
const logo = `data:image/png;base64,${(await readFile(path.join(ROOT, 'src/assets/brand/msserver-logo.png'))).toString('base64')}`;

const page = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Sora;src:url(${await font('@fontsource-variable/sora/files/sora-latin-wght-normal.woff2')});font-weight:100 800}
@font-face{font-family:Inter;src:url(${await font('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')});font-weight:100 900}
@font-face{font-family:Mono;src:url(${await font('@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2')});font-weight:100 800}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#f5f4f0;font-family:Inter;color:#1b1820;display:grid;grid-template-columns:600px 1fr;overflow:hidden}
.l{padding:64px 40px 56px 72px;display:flex;flex-direction:column}
.logo{width:190px}
h1{margin-top:auto;font-family:Sora;font-weight:600;font-size:52px;line-height:1.04;letter-spacing:-.035em}
.hl{background:linear-gradient(transparent 68%,rgba(249,131,5,.32) 68%,rgba(249,131,5,.32) 92%,transparent 92%)}
p{margin-top:24px;font-size:22px;color:#4e4955;line-height:1.45}
.r{margin:40px 40px 40px 0;border-radius:28px;background:radial-gradient(120% 80% at 100% 0%,rgba(61,58,134,.55),transparent 55%),radial-gradient(80% 60% at 0% 100%,rgba(249,131,5,.14),transparent 60%),#0e0d22;padding:40px 36px;display:flex;flex-direction:column;justify-content:center;color:#f4f3f8}
.k{font-family:Mono;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:#bcb9cf}
.r svg{width:100%;margin:28px 0}
.chips{display:flex;gap:10px;flex-wrap:wrap}
.chips span{font-family:Mono;font-size:15px;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:8px 12px;color:#f4f3f8}
</style></head><body>
<div class="l"><img class="logo" src="${logo}" alt=""><h1>Servidores dedicados no <span class="hl">tamanho certo</span> para a sua operação.</h1><p>Compra, locação ou data center · Dell, HP e IBM · extensão de garantia até 5 anos</p></div>
<div class="r"><span class="k">Simulador de configuração</span>${svg}<div class="chips"><span>Processador</span><span>Memória</span><span>Discos</span><span>Serviços</span></div></div>
</body></html>`;

const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await tab.setContent(page, { waitUntil: 'load' });
await tab.evaluate(() => document.fonts.ready);
await tab.screenshot({ path: path.join(ROOT, 'public/og-servidores-dedicados.jpg'), type: 'jpeg', quality: 88 });
await browser.close();
console.log('public/og-servidores-dedicados.jpg');
