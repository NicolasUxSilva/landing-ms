// Leitura dos ícones em tempo de build (Lucide, ISC; WhatsApp do Simple Icons, CC0).
// Nada disso vai para o JavaScript do navegador.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const cache = new Map<string, { body: string; viewBox: string; filled: boolean }>();

export function iconData(name: string) {
  const hit = cache.get(name);
  if (hit) return hit;
  const nm = path.join(process.cwd(), 'node_modules');
  let data;
  if (name === 'whatsapp') {
    const raw = readFileSync(path.join(nm, 'simple-icons/icons/whatsapp.svg'), 'utf8');
    const d = raw.match(/<path d="([^"]+)"/)?.[1] ?? '';
    data = { body: `<path d="${d}"/>`, viewBox: '0 0 24 24', filled: true };
  } else {
    const raw = readFileSync(path.join(nm, `lucide-static/icons/${name}.svg`), 'utf8');
    const body = raw
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/^[\s\S]*?<svg[^>]*>/, '')
      .replace(/<\/svg>\s*$/, '')
      .replace(/\s*\n\s*/g, '');
    data = { body, viewBox: '0 0 24 24', filled: false };
  }
  cache.set(name, data);
  return data;
}

export function iconSvg(name: string, opts: { size?: number; strokeWidth?: number; className?: string } = {}) {
  const { body, viewBox, filled } = iconData(name);
  const size = opts.size ?? 20;
  const paint = filled
    ? 'fill="currentColor"'
    : `fill="none" stroke="currentColor" stroke-width="${opts.strokeWidth ?? 1.75}" stroke-linecap="round" stroke-linejoin="round"`;
  return `<svg class="icon${opts.className ? ` ${opts.className}` : ''}" width="${size}" height="${size}" viewBox="${viewBox}" ${paint} aria-hidden="true" focusable="false">${body}</svg>`;
}
