// Gera src/data/catalog.json a partir da Store API pública do WooCommerce de
// msserver.com.br: servidores físicos (Rack/Torre), variações de memória e preços
// publicados. Rode antes de cada publicação para manter os preços atualizados.
// Uso: npm run sync:catalog
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const API = 'https://msserver.com.br/wp-json/wc/store/v1/products';
const UA = 'Mozilla/5.0 (MSSERVER landing catalog sync)';

async function fetchAll(params) {
  const items = [];
  for (let page = 1; page < 20; page++) {
    const url = `${API}?${new URLSearchParams({ ...params, per_page: '100', page: String(page) })}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

const decode = (s) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');

function brandOf(name) {
  if (/\bdell\b/i.test(name)) return 'Dell';
  if (/\bhp\b|proliant/i.test(name)) return 'HPE';
  if (/\bibm\b/i.test(name)) return 'IBM';
  return 'Outro';
}

function ramOf(variation) {
  const attr = Array.isArray(variation.variation) ? variation.variation.map((a) => a.value).join(' ') : String(variation.variation ?? '');
  const m = attr.match(/(\d+)\s*G/i);
  return m ? Number(m[1]) : null;
}

const map = JSON.parse(await readFile(path.join(ROOT, 'src/data/platform-map.json'), 'utf8'));
const [products, variations] = await Promise.all([fetchAll({}), fetchAll({ type: 'variation' })]);

const byParent = new Map();
for (const v of variations) {
  if (!byParent.has(v.parent)) byParent.set(v.parent, []);
  byParent.get(v.parent).push(v);
}

const warnings = [];
const models = [];
for (const p of products) {
  const cats = p.categories.map((c) => c.slug);
  const formFactor = cats.includes('torre') ? 'torre' : cats.includes('rack') ? 'rack' : null;
  if (!formFactor) continue;

  const entry = map.models[p.slug];
  if (!entry) {
    warnings.push(`Sem classificação de plataforma: ${p.slug} (${p.name}) — adicione em src/data/platform-map.json`);
    continue;
  }
  if (entry.exclude) continue;

  const minor = p.prices.currency_minor_unit ?? 2;
  const vars = (byParent.get(p.id) ?? [])
    .map((v) => {
      const cents = Number(v.prices.price) * 10 ** (2 - minor);
      return { ramGb: ramOf(v), priceCents: cents > 0 ? cents : null, inStock: Boolean(v.is_in_stock) };
    })
    .filter((v) => v.ramGb !== null)
    .sort((a, b) => a.ramGb - b.ramGb);

  if (vars.length === 0) warnings.push(`Sem variações de memória: ${p.slug}`);
  const priced = vars.filter((v) => v.priceCents !== null).map((v) => v.priceCents);

  models.push({
    id: p.id,
    slug: p.slug,
    name: decode(p.name).replace(/^Servidor\s+/i, '').trim(),
    brand: brandOf(p.name),
    formFactor,
    tier: entry.tier,
    sockets: entry.sockets,
    family: entry.family,
    url: p.permalink,
    inStock: Boolean(p.is_in_stock),
    minPriceCents: priced.length ? Math.min(...priced) : null,
    variations: vars,
  });
}

models.sort((a, b) => (a.minPriceCents ?? Infinity) - (b.minPriceCents ?? Infinity));

const catalog = {
  source: API,
  fetchedAt: new Date().toISOString(),
  currency: 'BRL',
  note: 'Preços publicados no catálogo de msserver.com.br para o equipamento na variação de memória indicada. Valor 0 no WooCommerce é tratado como "sob consulta" (priceCents: null).',
  models,
};

await writeFile(path.join(ROOT, 'src/data/catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
console.log(`Catálogo salvo: ${models.length} servidores (${new Date(catalog.fetchedAt).toLocaleString('pt-BR')}).`);
for (const w of warnings) console.warn('  ⚠', w);
