import { DATACENTER_CPUS, DATACENTER_STORAGE, storageLabel } from '../data/datacenter';
import { brl, FORM_FACTORS, MODALITIES, modelsFor, pathOf, serviceTitle, STORAGE_CAPACITIES, STORAGE_TYPES, TIER_ORDER, TIERS, workloadTitle } from './options';
import type { Catalog, ContactData, SimState, StepId, Tier } from './types';
import { UNSURE } from './types';

export interface SummaryRow {
  step: StepId;
  label: string;
  value: string;
  detail?: string;
  status: 'set' | 'pending' | 'expert';
}

const TBD = 'A definir com o especialista';
const titleOf = (list: { value: string; title: string }[], v: string | null) => list.find((o) => o.value === v)?.title ?? '';

export function modalityText(s: SimState): string {
  if (!s.modality) return '';
  const base = { buy: 'Compra', rent: 'Locação', datacenter: 'Data center', compare: 'Comparar opções' }[s.modality];
  if (pathOf(s.modality) === 'physical' && s.formFactor && s.formFactor !== 'any') return `${base} · ${titleOf(FORM_FACTORS, s.formFactor)}`;
  return base;
}

export function processorText(s: SimState): { value: string; detail?: string } {
  if (!s.processor) return { value: '' };
  if (s.processor === UNSURE) return { value: TBD };
  if (pathOf(s.modality) === 'datacenter') {
    const cpu = DATACENTER_CPUS.find((c) => c.id === s.processor);
    return cpu ? { value: cpu.label.replace('Intel ', ''), detail: `${cpu.cores} núcleos · ${cpu.threads} threads · ${cpu.baseGhz} GHz` } : { value: '' };
  }
  const tier = TIERS[s.processor as Tier];
  return tier ? { value: tier.title } : { value: '' };
}

export function memoryText(s: SimState): string {
  if (!s.memory) return '';
  if (s.memory === UNSURE) return TBD;
  if (s.memory === 'more') return pathOf(s.modality) === 'datacenter' ? 'Mais de 64 GB' : 'Mais de 128 GB';
  return `${s.memory} GB`;
}

export function storageText(s: SimState): string {
  if (pathOf(s.modality) === 'datacenter') {
    if (!s.storage) return '';
    if (s.storage === UNSURE) return TBD;
    if (s.storage === 'other') return 'Outra configuração';
    const d = DATACENTER_STORAGE.find((x) => x.id === s.storage);
    return d ? storageLabel(d) : '';
  }
  if (!s.storageType || !s.storageCapacity) return '';
  if (s.storageType === UNSURE && s.storageCapacity === UNSURE) return TBD;
  const type = s.storageType === UNSURE ? 'Tipo a definir' : titleOf(STORAGE_TYPES, s.storageType);
  const cap = s.storageCapacity === UNSURE ? 'capacidade a definir' : titleOf(STORAGE_CAPACITIES, s.storageCapacity);
  return `${type} · ${cap}`;
}

export function workloadsText(s: SimState): string {
  if (s.workloads.length === 0) return '';
  if (s.workloads.includes(UNSURE)) return TBD;
  return s.workloads
    .map((w) => (w === 'other' && s.otherWorkload.trim() ? `Outro: ${s.otherWorkload.trim()}` : workloadTitle(w)))
    .join(', ');
}

export function servicesText(s: SimState): string {
  return s.services.length ? s.services.map(serviceTitle).join(', ') : 'Nenhum serviço adicional';
}

export function summarize(s: SimState): SummaryRow[] {
  const row = (step: StepId, label: string, value: string, detail?: string): SummaryRow => ({
    step,
    label,
    value: value || 'Pendente',
    detail,
    status: !value ? 'pending' : value === TBD ? 'expert' : 'set',
  });
  const cpu = processorText(s);
  const rows: SummaryRow[] = [
    row('objetivo', 'Uso', workloadsText(s)),
    row('modalidade', 'Modalidade', modalityText(s)),
    row('processador', 'Processador', cpu.value, cpu.detail),
    row('memoria', 'Memória', memoryText(s)),
    row('armazenamento', 'Armazenamento', storageText(s)),
  ];
  if (pathOf(s.modality) === 'datacenter') {
    rows.push(row('servicos', 'IPs', s.ips ? `${s.ips} ${s.ips === '1' ? 'IP' : 'IPs'}` : ''));
  }
  return rows;
}

// ——— Referência de preço (somente compra de servidor físico) ———

export interface PriceReference {
  kind: 'published';
  fromCents: number;
  count: number;
  ramGb: number | null;
  models: { name: string; url: string; tier: string; ramGb: number | null; priceCents: number; formFactor: string }[];
}

export type PriceInfo = PriceReference | { kind: 'quote'; reason: string } | { kind: 'none' };

export function priceInfo(s: SimState, catalog: Catalog): PriceInfo {
  const path = pathOf(s.modality);
  if (!path) return { kind: 'none' };
  if (s.modality === 'rent') return { kind: 'quote', reason: 'Os valores de locação dependem do prazo e da configuração e são enviados na proposta.' };
  if (path === 'datacenter') return { kind: 'quote', reason: 'O servidor em data center é orçado pela equipe a partir da configuração escolhida.' };
  if (!s.processor) return { kind: 'none' };
  if (s.memory === 'more') return { kind: 'quote', reason: 'Configurações acima de 128 GB não têm preço publicado e são orçadas sob medida.' };

  const tiers = s.processor === UNSURE ? TIER_ORDER : [s.processor as Tier];
  const ramGb = s.memory && /^\d+$/.test(s.memory) ? Number(s.memory) : null;
  const models = modelsFor(catalog, { tiers, formFactor: s.formFactor, ramGb })
    .map((m) => {
      const v = ramGb ? m.variations.find((x) => x.ramGb === ramGb && x.priceCents !== null) : null;
      return {
        name: m.name,
        url: m.url,
        tier: TIERS[m.tier].title,
        formFactor: m.formFactor,
        ramGb: v ? v.ramGb : null,
        priceCents: (v ? v.priceCents : m.minPriceCents) as number,
      };
    })
    .sort((a, b) => a.priceCents - b.priceCents);

  if (models.length === 0) return { kind: 'quote', reason: 'Não há equipamento com preço publicado para esta combinação. A equipe monta a proposta sob medida.' };
  return { kind: 'published', fromCents: models[0].priceCents, count: models.length, ramGb, models };
}

// ——— Mensagens para a equipe comercial ———

const quantityText = (s: SimState) => `${s.quantity} ${s.quantity === 1 ? 'servidor' : 'servidores'}`;

const TIMELINE: Record<string, string> = { now: 'Imediato', '30d': 'Em até 30 dias', '90d': 'Em 1 a 3 meses', research: 'Pesquisando opções' };
const PREFERENCE: Record<string, string> = { whatsapp: 'WhatsApp', phone: 'Ligação', email: 'E-mail' };

export function configLines(s: SimState, catalog: Catalog): [string, string][] {
  const lines: [string, string][] = summarize(s).map((r) => [r.label, r.detail ? `${r.value} (${r.detail})` : r.value]);
  lines.push(['Serviços', servicesText(s)]);
  lines.push(['Quantidade', quantityText(s)]);
  const price = priceInfo(s, catalog);
  if (price.kind === 'published') {
    const first = price.models[0];
    lines.push([
      'Referência publicada',
      `a partir de ${brl(price.fromCents)} (${first.name}${first.ramGb ? ` ${first.ramGb} GB` : ''})`,
    ]);
  }
  return lines;
}

/**
 * Texto da configuração para WhatsApp e e-mail. Não inclui nome, empresa ou
 * telefone: links wa.me podem ser registrados como URL de saída pelo analytics.
 * As observações só entram no e-mail (mailto não é rastreado como link externo).
 */
export function whatsappMessage(s: SimState, catalog: Catalog, notes?: string): string {
  const body = configLines(s, catalog).map(([k, v]) => `• ${k}: ${v}`);
  return [
    'Olá! Montei uma configuração no simulador de servidores dedicados da MSSERVER e gostaria de uma proposta.',
    '',
    ...body,
    ...(notes?.trim() ? ['', `Observações: ${notes.trim()}`] : []),
  ].join('\n');
}

export interface LeadExtras {
  origin?: string;
}

export function leadDescription(s: SimState, catalog: Catalog, contact: ContactData, extras: LeadExtras = {}): string {
  const parts = configLines(s, catalog).map(([k, v]) => `${k}: ${v}`);
  parts.push(`Preferência de contato: ${PREFERENCE[contact.preference]}`);
  if (contact.timeline) parts.push(`Prazo: ${TIMELINE[contact.timeline]}`);
  if (contact.notes.trim()) parts.push(`Observações: ${contact.notes.trim().replace(/\s+/g, ' ')}`);
  if (extras.origin) parts.push(`Origem: ${extras.origin}`);
  return `[Simulador · Servidores dedicados] ${parts.join(' | ')}`;
}

export const specializedLaborAnswer = (s: SimState) => (s.services.includes('consulting') ? 'Sim' : 'A definir');

export const modalityTitle = (v: string | null) => titleOf(MODALITIES, v);
