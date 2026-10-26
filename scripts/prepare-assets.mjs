// Baixa os ativos oficiais publicados em msserver.com.br e gera as versões
// otimizadas usadas pela landing page (src/assets e public/).
// Uso: npm run assets
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const UPLOADS = 'https://msserver.com.br/wp-content/uploads';
const UA = 'Mozilla/5.0 (MSSERVER landing build script)';

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function out(rel, buffer) {
  const file = path.join(ROOT, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buffer);
  console.log('  ✓', rel);
}

// Logotipo oficial (sem alteração de desenho ou cor, apenas redimensionado).
async function brand() {
  console.log('Marca');
  const logo = await download(`${UPLOADS}/2025/08/cropped-MS-Server_Cloud-1-scaled-1-e1755871178311-2048x513.png`);
  await out('src/assets/brand/msserver-logo.png', await sharp(logo).trim().resize({ width: 960 }).png({ compressionLevel: 9 }).toBuffer());

  const icons = [
    ['cropped-cropped-MS-Server_Cloud-1-scaled-1-e1755871178311-32x32.png', 'public/favicon-32.png'],
    ['cropped-cropped-MS-Server_Cloud-1-scaled-1-e1755871178311-180x180.png', 'public/apple-touch-icon.png'],
    ['cropped-cropped-MS-Server_Cloud-1-scaled-1-e1755871178311-192x192.png', 'public/icon-192.png'],
  ];
  for (const [file, dest] of icons) await out(dest, await download(`${UPLOADS}/2025/08/${file}`));
}

// Fotografia real da equipe MSSERVER (página Quem Somos).
async function photos() {
  console.log('Fotografia');
  const team = await download(`${UPLOADS}/2026/04/MS-178-de-206.JPG-1.jpeg`);
  await out('src/assets/photos/equipe-msserver.jpg', await sharp(team).rotate().resize({ width: 2400 }).jpeg({ quality: 80, mozjpeg: true }).toBuffer());

  const thumb = await fetch('https://i.ytimg.com/vi/Q6MG--nERJA/maxresdefault.jpg');
  if (thumb.ok) {
    await out('src/assets/video/5-erros-ao-comprar-servidor.jpg', await sharp(Buffer.from(await thumb.arrayBuffer())).jpeg({ quality: 80, mozjpeg: true }).toBuffer());
  }
}

// Fotos de produto: apenas modelos cuja foto publicada corresponde ao próprio modelo.
const PRODUCT_PHOTOS = {
  'dell-r740': '2023/06/dell-r740.jpeg',
  'dell-r640': '2023/06/R640.jpg',
  'hp-dl380-g10': '2026/01/Captura-de-Tela-2026-01-22-as-16.05.44.png',
  'dell-r630': '2023/06/dell-r630-2.jpeg',
  'dell-t630': '2023/06/dell-t630-1.png',
  'hp-ml350-g9': '2023/06/hp-ml350-g9.png',
};

async function products() {
  console.log('Produtos');
  for (const [key, rel] of Object.entries(PRODUCT_PHOTOS)) {
    const src = await download(`${UPLOADS}/${rel}`);
    // Recorta o fundo branco e enquadra todos os modelos na mesma área útil
    // (ampliação limitada a 1,8× para não degradar fotos pequenas).
    const { data: trimmed, info } = await sharp(src)
      .flatten({ background: '#ffffff' })
      .trim({ background: '#ffffff', threshold: 18 })
      .toBuffer({ resolveWithObject: true });
    const scale = Math.min(760 / info.width, 470 / info.height, 1.8);
    const resized = await sharp(trimmed)
      .resize({ width: Math.round(info.width * scale), height: Math.round(info.height * scale), kernel: 'lanczos3' })
      .toBuffer({ resolveWithObject: true });
    const padX = 920 - resized.info.width;
    const padY = 680 - resized.info.height;
    const framed = await sharp(resized.data)
      .extend({ left: Math.floor(padX / 2), right: Math.ceil(padX / 2), top: Math.floor(padY / 2), bottom: Math.ceil(padY / 2), background: '#ffffff' })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
    await out(`src/assets/products/${key}.jpg`, framed);
    console.log(`    ${key}: ${info.width}×${info.height} → ×${scale.toFixed(2)}`);
  }
}

// Logos de clientes publicados em "Alguns clientes": convertidos para um único tom,
// para formar uma faixa visual consistente, sem alterar o desenho das marcas.
const CLIENTS = [
  ['correios', 'Correios'],
  ['EXERCITO-BRASILEIRO', 'Exército Brasileiro'],
  ['Design-sem-nome-2023-05-23T161719.488-1', "McDonald's"],
  ['data-safer', 'Datasafer'],
  ['SHOP.-ARICANDUVA', 'Shopping Aricanduva'],
  ['OTIMI', 'Otimi Tecnologia'],
  ['WAY-306', 'WAY 306'],
  ['voxline', 'Voxline'],
  ['ZAFEX', 'Zafex'],
  ['attri', 'Attri'],
];

async function monochrome(buffer, ink = [36, 33, 41]) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const px = (x, y) => (y * width + x) * 4;
  const corners = [px(1, 1), px(width - 2, 1), px(1, height - 2), px(width - 2, height - 2)];
  const bg = [0, 1, 2].map((c) => corners.reduce((s, i) => s + data[i + c], 0) / corners.length);
  const outBuf = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const dist = Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
    const t = Math.min(1, Math.max(0, (dist - 18) / 70));
    outBuf[i] = ink[0];
    outBuf[i + 1] = ink[1];
    outBuf[i + 2] = ink[2];
    outBuf[i + 3] = Math.min(255, Math.round(t * (data[i + 3] / 255) * 255 * 1.35));
  }
  return sharp(outBuf, { raw: { width, height, channels: 4 } }).trim({ threshold: 1 }).resize({ height: 96, withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
}

async function clients() {
  console.log('Clientes');
  const manifest = [];
  for (const [file, name] of CLIENTS) {
    const src = await download(`${UPLOADS}/2024/04/${file}.png`);
    const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const png = await monochrome(src);
    const meta = await sharp(png).metadata();
    await out(`src/assets/clients/${slug}.png`, png);
    manifest.push({ slug, name, width: meta.width, height: meta.height });
  }
  await out('src/data/clients.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
}

await brand();
await photos();
await products();
await clients();
console.log('Ativos prontos.');
