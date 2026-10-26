// Servidor estático do build (dist/) com o mesmo endpoint de teste do `astro dev`.
// Usado pelos testes E2E. Nunca encaminha dados para fora da máquina.
// Uso: node scripts/preview-mock.mjs [porta] [pasta]
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.argv[2] ?? 4330);
// Pasta servida (padrão: dist/). Usada também para servir o build de referência.
const root = path.resolve(process.argv[3] ?? fileURLToPath(new URL('../dist/', import.meta.url))) + path.sep;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/__mock/lead') {
    if (req.method !== 'POST') return res.writeHead(405).end();
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const fail = /name\]"\r?\n\r?\n[^\r\n]*falha/i.test(raw);
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify(
            fail
              ? { success: false, data: { message: 'Simulação de erro do servidor (ambiente de teste).', errors: [], data: [] } }
              : { success: true, data: { message: 'Recebido pelo endpoint de teste. Nenhum dado foi enviado à MSSERVER.', data: [] } },
          ),
        );
      }, 700);
    });
    return;
  }
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const body = await readFile(file);
    const type = types[path.extname(file)] ?? 'application/octet-stream';
    // Comprime como um servidor de produção faria (HTML, CSS, JS, SVG, JSON).
    const compress = /text|javascript|svg|json/.test(type) && /gzip/.test(req.headers['accept-encoding'] ?? '');
    const cache = url.pathname.startsWith('/_astro/') ? 'public, max-age=31536000, immutable' : 'no-cache';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache, ...(compress ? { 'Content-Encoding': 'gzip' } : {}) });
    res.end(compress ? gzipSync(body) : body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, () => console.log(`dist em http://localhost:${port}`));
