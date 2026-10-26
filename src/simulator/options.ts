import { CPU_GENERATIONS, DATACENTER_CPUS, DATACENTER_IPS, DATACENTER_MEMORY, DATACENTER_STORAGE, MEDIA_LABEL, storageLabel } from '../data/datacenter';
import type { Catalog, FormFactor, Modality, Option, Path, SimState, StepDef, Tier, Workload } from './types';
import { UNSURE } from './types';

export const STEPS: StepDef[] = [
  { id: 'objetivo', label: 'Objetivo', title: 'Para que o servidor vai ser usado?', lead: 'Escolha um ou mais usos. Isso orienta as dicas das próximas etapas.' },
  { id: 'modalidade', label: 'Modalidade', title: 'Como você prefere contratar?', lead: 'A modalidade define o catálogo disponível nas próximas etapas.' },
  { id: 'processador', label: 'Processador', title: 'Qual processamento você precisa?', lead: '' },
  { id: 'memoria', label: 'Memória', title: 'Quanta memória RAM?', lead: '' },
  { id: 'armazenamento', label: 'Discos', title: 'Como deve ser o armazenamento?', lead: '' },
  { id: 'servicos', label: 'Serviços', title: 'Serviços e detalhes finais', lead: 'Todos os serviços são opcionais e orçados à parte.' },
  { id: 'contato', label: 'Envio', title: 'Revise e envie para um especialista', lead: 'Confira a configuração e informe como prefere ser contatado. A proposta é preparada pela equipe comercial.' },
];

export const WORKLOADS: Option[] = [
  { value: 'erp', title: 'Sistemas de gestão e ERP', description: 'ERP, sistemas fiscais, CRM e aplicações internas.', icon: 'layout-dashboard' },
  { value: 'database', title: 'Banco de dados', description: 'SQL Server, PostgreSQL, MySQL e similares.', icon: 'database' },
  { value: 'virtualization', title: 'Virtualização', description: 'Vários servidores virtuais em um único equipamento.', icon: 'layers' },
  { value: 'web', title: 'Aplicações e sites', description: 'Sistemas web, e-commerce, APIs e portais.', icon: 'globe' },
  { value: 'files', title: 'Arquivos e backup', description: 'Compartilhamento de arquivos e retenção de cópias.', icon: 'folder-archive' },
  { value: 'other', title: 'Outro cenário', description: 'Descreva rapidamente a sua necessidade.', icon: 'pen-line' },
  { value: UNSURE, title: 'Ainda não sei', description: 'Um especialista ajuda a definir a partir da sua operação.', icon: 'circle-help', exclusive: true },
];

export const MODALITIES: Option[] = [
  { value: 'buy', title: 'Comprar servidor físico', description: 'O equipamento é da sua empresa. Garantia padrão de 1 ano, com extensão até 5 anos.', meta: 'Mostra preços publicados', icon: 'server' },
  { value: 'rent', title: 'Alugar servidor físico', description: 'Use o equipamento sem imobilizar capital. Prazo e condições vêm na proposta.', icon: 'calendar-sync' },
  { value: 'datacenter', title: 'Servidor dedicado em data center', description: 'Hardware exclusivo hospedado em data center, com IPs dedicados.', icon: 'cloud' },
  { value: 'compare', title: 'Ainda não sei, quero comparar', description: 'Configure o servidor e receba as opções de compra, locação e data center.', icon: 'scale' },
];

export const FORM_FACTORS: Option[] = [
  { value: 'rack', title: 'Rack', description: 'Para rack de 19" em sala técnica ou data center.', icon: 'server' },
  { value: 'torre', title: 'Torre', description: 'Para escritórios sem rack. Fica em pé, como um gabinete.', icon: 'pc-case' },
  { value: 'any', title: 'Sem preferência', description: 'O especialista indica o formato mais adequado.', icon: 'circle-help' },
];

export const TIERS: Record<Tier, { title: string; description: string; examples: string }> = {
  scalable: {
    title: 'Intel Xeon Scalable',
    description: 'Plataforma mais recente do catálogo, memória DDR4. Mais margem para virtualização e bancos de dados maiores.',
    examples: 'Dell PowerEdge R440, R640, R740 · HPE ProLiant DL360/DL380 Gen10',
  },
  e5v34: {
    title: 'Intel Xeon E5 v3/v4',
    description: 'Equilíbrio entre desempenho e investimento, memória DDR4 e até dois processadores.',
    examples: 'Dell PowerEdge R630, R730, T630 · HPE ProLiant Gen9',
  },
  e5v12: {
    title: 'Intel Xeon E5 v1/v2',
    description: 'Menor investimento para cargas moderadas, memória DDR3.',
    examples: 'Dell PowerEdge R620, R720, T620 · HPE ProLiant Gen8 · IBM M4',
  },
  entry: {
    title: 'Processador único (entrada)',
    description: 'Servidores compactos para arquivos, controlador de domínio e sistemas leves.',
    examples: 'Dell PowerEdge R220, R230, T330 · HPE ProLiant ML310 Gen8',
  },
  legacy: {
    title: 'Gerações anteriores',
    description: 'Xeon 5500/5600 e E7, memória DDR3. Para cargas leves ou manutenção de ambientes legados.',
    examples: 'Dell PowerEdge R610, R910, T610 · HPE ProLiant G6/G7',
  },
};

export const TIER_ORDER: Tier[] = ['scalable', 'e5v34', 'e5v12', 'entry', 'legacy'];

export const STORAGE_TYPES: Option[] = [
  { value: 'ssd', title: 'SSD', description: 'Mais velocidade de leitura e gravação.', icon: 'zap' },
  { value: 'hdd', title: 'HDD', description: 'Mais capacidade pelo mesmo investimento.', icon: 'hard-drive' },
  { value: 'mixed', title: 'SSD + HDD', description: 'Sistema e bancos no SSD, dados em volume no HDD.', icon: 'layers' },
  { value: UNSURE, title: 'Não sei', description: 'O especialista indica a combinação.', icon: 'circle-help' },
];

export const STORAGE_CAPACITIES: Option[] = [
  { value: 'lt1', title: 'Até 1 TB' },
  { value: '1to4', title: '1 a 4 TB' },
  { value: '4to10', title: '4 a 10 TB' },
  { value: 'gt10', title: 'Acima de 10 TB' },
  { value: UNSURE, title: 'Não sei' },
];

const SERVICE_DEFS: Record<string, Option & { modalities: Modality[] }> = {
  warranty: {
    value: 'warranty',
    title: 'Extensão de garantia',
    description: 'Amplia a garantia padrão de 1 ano para até 5 anos, com peças incluídas.',
    icon: 'shield-check',
    modalities: ['buy', 'compare'],
  },
  support: {
    value: 'support',
    title: 'Suporte e manutenção',
    description: 'Atendimento técnico especializado, inclusive on-site.',
    icon: 'wrench',
    modalities: ['buy', 'rent', 'compare'],
  },
  consulting: {
    value: 'consulting',
    title: 'Consultoria e implantação',
    description: 'Projeto e instalação dos serviços no novo servidor.',
    icon: 'compass',
    modalities: ['buy', 'rent', 'datacenter', 'compare'],
  },
  backup: {
    value: 'backup',
    title: 'Backup em nuvem',
    description: 'Rotinas automáticas, com cópias fora da empresa.',
    icon: 'cloud-upload',
    modalities: ['buy', 'rent', 'compare'],
  },
  buyback: {
    value: 'buyback',
    title: 'Recompra do equipamento atual',
    description: 'Avaliamos o seu servidor atual na troca pelo novo.',
    icon: 'repeat',
    modalities: ['buy', 'rent', 'compare'],
  },
  'daily-backup': {
    value: 'daily-backup',
    title: 'Backup diário',
    description: 'Cópias em ambiente externo para recuperar arquivos e bancos.',
    icon: 'cloud-upload',
    modalities: ['datacenter'],
  },
  vpn: { value: 'vpn', title: 'VPN com o escritório', description: 'Conexão segura entre o servidor e a sua rede.', icon: 'lock', modalities: ['datacenter'] },
  firewall: { value: 'firewall', title: 'Firewall dedicado', description: 'Regras de segurança próprias para o seu ambiente.', icon: 'brick-wall', modalities: ['datacenter'] },
  vlan: { value: 'vlan', title: 'VLAN privada', description: 'Rede interna isolada para o tráfego entre servidores.', icon: 'network', modalities: ['datacenter'] },
  p2p: { value: 'p2p', title: 'Link ponto a ponto', description: 'Interligação direta com o seu escritório.', icon: 'cable', modalities: ['datacenter'] },
};

export const pathOf = (modality: Modality | null): Path | null =>
  modality === null ? null : modality === 'datacenter' ? 'datacenter' : 'physical';

export function serviceOptions(modality: Modality | null): Option[] {
  if (!modality) return [];
  return Object.values(SERVICE_DEFS)
    .filter((s) => s.modalities.includes(modality))
    .map(({ modalities: _m, ...o }) => o);
}

export const serviceTitle = (value: string) => SERVICE_DEFS[value]?.title ?? value;

export function processorOptions(state: SimState, catalog: Catalog): Option[] {
  const path = pathOf(state.modality);
  if (path === 'datacenter') {
    return [
      ...DATACENTER_CPUS.map((c) => ({
        value: c.id,
        title: c.label,
        meta: `${c.cores} núcleos · ${c.threads} threads · ${c.baseGhz} GHz`,
        group: CPU_GENERATIONS[c.generation].label,
        icon: 'cpu',
      })),
      { ...unsureOption('Quero recomendação', 'O especialista indica o processador para o seu uso.'), group: 'Não tem certeza?' },
    ];
  }
  return [
    ...TIER_ORDER.map((tier) => {
      const models = modelsFor(catalog, { tier, formFactor: state.formFactor });
      const from = minPrice(models.map((m) => m.minPriceCents));
      // Os preços publicados são de compra: na locação, só a disponibilidade.
      const showPrice = state.modality !== 'rent' && from !== null;
      return {
        value: tier,
        title: TIERS[tier].title,
        description: TIERS[tier].description,
        meta: models.length
          ? `${models.length} ${models.length === 1 ? 'modelo' : 'modelos'}${showPrice ? ` · a partir de ${brl(from)}` : ' no catálogo'}`
          : 'Sob consulta neste formato',
        icon: 'cpu',
      };
    }),
    unsureOption('Quero recomendação', 'O especialista indica a plataforma a partir do seu uso.'),
  ];
}

export const PHYSICAL_MEMORY = [8, 16, 32, 64, 128];

export function memoryOptions(state: SimState, catalog: Catalog): Option[] {
  const path = pathOf(state.modality);
  if (path === 'datacenter') {
    return [
      ...DATACENTER_MEMORY.map((gb) => ({ value: String(gb), title: `${gb} GB` })),
      { value: 'more', title: 'Mais de 64 GB', description: 'Sob consulta' },
      unsureOption('Não sei'),
    ];
  }
  const tier = state.processor && state.processor !== UNSURE ? (state.processor as Tier) : null;
  return [
    ...PHYSICAL_MEMORY.map((gb) => {
      const count = modelsFor(catalog, { tier, formFactor: state.formFactor, ramGb: gb }).length;
      const noun = count === 1 ? 'modelo' : 'modelos';
      return {
        value: String(gb),
        title: `${gb} GB`,
        meta: count ? (state.modality === 'rent' ? `${count} ${noun} no catálogo` : `${count} ${noun} com preço`) : 'Sob consulta',
      };
    }),
    { value: 'more', title: 'Mais de 128 GB', description: 'Sob consulta' },
    unsureOption('Não sei'),
  ];
}

export function datacenterStorageOptions(): Option[] {
  return [
    ...DATACENTER_STORAGE.map((s) => ({ value: s.id, title: storageLabel(s), group: MEDIA_LABEL[s.media], icon: s.media === 'hdd' ? 'hard-drive' : 'zap' })),
    { value: 'other', title: 'Outra configuração', description: 'Descreva nas observações do envio.', group: 'Outras opções', icon: 'pen-line' },
    { ...unsureOption('Não sei'), group: 'Outras opções' },
  ];
}

export const ipOptions = (): Option[] => DATACENTER_IPS.map((n) => ({ value: String(n), title: String(n) }));

function unsureOption(title: string, description?: string): Option {
  return { value: UNSURE, title, description, icon: 'circle-help' };
}

// ——— Catálogo físico ———

interface ModelFilter {
  tier?: Tier | null;
  tiers?: Tier[];
  formFactor?: FormFactor | null;
  ramGb?: number | null;
}

export function modelsFor(catalog: Catalog, f: ModelFilter) {
  return catalog.models.filter((m) => {
    if (f.tier && m.tier !== f.tier) return false;
    if (f.tiers && !f.tiers.includes(m.tier)) return false;
    if (f.formFactor && f.formFactor !== 'any' && m.formFactor !== f.formFactor) return false;
    if (f.ramGb) return m.variations.some((v) => v.ramGb === f.ramGb && v.priceCents !== null);
    return m.minPriceCents !== null;
  });
}

export const minPrice = (values: (number | null)[]) => {
  const nums = values.filter((v): v is number => v !== null);
  return nums.length ? Math.min(...nums) : null;
};

export const brl = (cents: number) => {
  const digits = cents % 100 === 0 ? 0 : 2;
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: digits, maximumFractionDigits: digits });
};

export const workloadTitle = (w: Workload) => WORKLOADS.find((o) => o.value === w)?.title ?? w;
