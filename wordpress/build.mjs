// Gera o plugin WordPress com o build da landing aprovada.
// Uso: npm run build:wp
// Saída: wordpress/dist/msserver-landing-servidores/ e wordpress/dist/msserver-landing-servidores-<versão>.zip
//
// O código da landing (src/) não é alterado: o build é o mesmo de produção, só com
// BASE_PATH=/__MSLP__ (marcador que o plugin troca pela URL real dos arquivos) e
// sem GTM embutido (o plugin repassa o rastreamento já configurado no WordPress).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SLUG = 'msserver-landing-servidores';
const BUILD = path.join(ROOT, 'wordpress/.build/app');
const DIST = path.join(ROOT, 'wordpress/dist');
const PLUGIN_OUT = path.join(DIST, SLUG);
const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
const version = process.env.PLUGIN_VERSION ?? pkg.version;

console.log(`1/5 Build da landing (versão ${version})`);
await rm(BUILD, { recursive: true, force: true });
execFileSync(process.execPath, [path.join(ROOT, 'node_modules/astro/bin/astro.mjs'), 'build', '--outDir', BUILD], {
  cwd: ROOT,
  stdio: ['ignore', 'ignore', 'inherit'],
  env: { ...process.env, BASE_PATH: '/__MSLP__', PUBLIC_LEAD_MODE: 'elementor', PUBLIC_GTM_ID: '', PUBLIC_NOINDEX: 'false' },
});

console.log('2/5 Verificando caminhos');
const files = await walk(BUILD);
const html = await readFile(path.join(BUILD, 'index.html'), 'utf8');
if (!html.includes('/__MSLP__/_astro/')) throw new Error('O index.html não usa o marcador de caminho esperado.');
for (const f of files.filter((f) => /\.(js|css|json)$/.test(f))) {
  if ((await readFile(f, 'utf8')).includes('__MSLP__')) throw new Error(`Marcador de caminho dentro de ${path.relative(BUILD, f)}: o plugin só troca caminhos no HTML.`);
}
const leftover = html.match(/(?:src|href|srcset)="\/(?!__MSLP__\/)[^"]*/g);
if (leftover) throw new Error(`Caminhos absolutos fora do marcador: ${leftover.slice(0, 3).join(', ')}`);

console.log('3/5 Montando o plugin');
await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
await cp(path.join(ROOT, 'wordpress/plugin', SLUG), PLUGIN_OUT, { recursive: true });
await cp(BUILD, path.join(PLUGIN_OUT, 'app'), { recursive: true });
const main = path.join(PLUGIN_OUT, `${SLUG}.php`);
await writeFile(
  main,
  (await readFile(main, 'utf8')).replace(/(\* Version:\s+)\S+/, `$1${version}`).replace(/define\( 'MSSLP_VERSION', '[^']+' \);/, `define( 'MSSLP_VERSION', '${version}' );`),
);
const readme = path.join(PLUGIN_OUT, 'readme.txt');
await writeFile(readme, (await readFile(readme, 'utf8')).replace(/Stable tag: \S+/, `Stable tag: ${version}`));

console.log('4/5 Manifesto');
const catalog = JSON.parse(await readFile(path.join(ROOT, 'src/data/catalog.json'), 'utf8'));
const manifest = {
  version,
  builtAt: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  catalogFetchedAt: new Date(catalog.fetchedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  indexSha256: createHash('sha256').update(html).digest('hex'),
  files: files.length,
};
await writeFile(path.join(PLUGIN_OUT, 'app/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log('5/5 Compactando');
const zip = path.join(DIST, `${SLUG}-${version}.zip`);
execFileSync('zip', ['-r', '-X', '-q', zip, SLUG, '-x', '*.DS_Store'], { cwd: DIST });
// Cópia sem versão no nome, instalada pelo WordPress local de teste (npm run wp:dev).
await cp(zip, path.join(DIST, `${SLUG}.zip`));
console.log(`Pronto: ${path.relative(ROOT, zip)} (${((await stat(zip)).size / 1024).toFixed(0)} KB, ${files.length} arquivos da landing)`);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}
