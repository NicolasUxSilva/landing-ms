// Garante que o WordPress local está no ar e com a landing no modo "No ar".
export default async function globalSetup() {
  const wp = process.env.WP_URL ?? 'http://127.0.0.1:9400';
  const res = await fetch(`${wp}/wp-admin/admin-ajax.php?action=msslp_test&cmd=set_mode&mode=live`).catch(() => null);
  if (!res?.ok) throw new Error(`WordPress local indisponível em ${wp}. Rode: npm run wp:dev`);
  const state = await res.json();
  if (state?.settings?.mode !== 'live') throw new Error('Não foi possível colocar o plugin no modo "No ar".');
}
