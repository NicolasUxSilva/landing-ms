// Compara pixel a pixel duas séries de capturas (referência × WordPress).
// Uso: node wordpress/test/compare.mjs <rótulo-referência> <rótulo-alvo>
// Gera reports/fidelity/diff-<alvo>/<largura>.png (diferenças em vermelho) e um resumo.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const [refLabel, targetLabel] = process.argv.slice(2);
const base = fileURLToPath(new URL('../../reports/fidelity/', import.meta.url));
const diffDir = `${base}diff-${targetLabel}/`;
await mkdir(diffDir, { recursive: true });
const refMetrics = JSON.parse(await readFile(`${base}${refLabel}/metrics.json`, 'utf8'));

const results = {};
for (const width of Object.keys(refMetrics)) {
  const load = async (label) => sharp(`${base}${label}/${width}.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const [a, b] = await Promise.all([load(refLabel), load(targetLabel)]);
  const w = Math.min(a.info.width, b.info.width);
  const h = Math.min(a.info.height, b.info.height);
  const diff = Buffer.alloc(w * h * 3);
  let changed = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ia = (y * a.info.width + x) * 3;
      const ib = (y * b.info.width + x) * 3;
      const d = Math.max(Math.abs(a.data[ia] - b.data[ib]), Math.abs(a.data[ia + 1] - b.data[ib + 1]), Math.abs(a.data[ia + 2] - b.data[ib + 2]));
      const o = (y * w + x) * 3;
      if (d > 24) {
        changed++;
        diff[o] = 255;
        diff[o + 1] = 0;
        diff[o + 2] = 0;
      } else {
        const g = Math.round(a.data[ia] * 0.3 + a.data[ia + 1] * 0.59 + a.data[ia + 2] * 0.11);
        diff[o] = diff[o + 1] = diff[o + 2] = Math.round(200 + g * 0.2);
      }
    }
  }
  await sharp(diff, { raw: { width: w, height: h, channels: 3 } }).png().toFile(`${diffDir}${width}.png`);
  results[width] = {
    refSize: `${a.info.width}×${a.info.height}`,
    targetSize: `${b.info.width}×${b.info.height}`,
    sameSize: a.info.width === b.info.width && a.info.height === b.info.height,
    changedPixels: changed,
    changedPct: Number(((changed / (w * h)) * 100).toFixed(4)),
  };
}
await writeFile(`${diffDir}summary.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 1));
