export type Workload = 'erp' | 'database' | 'virtualization' | 'web' | 'files' | 'other' | 'unsure';
export type Modality = 'buy' | 'rent' | 'datacenter' | 'compare';
export type FormFactor = 'rack' | 'torre' | 'any';
export type Path = 'physical' | 'datacenter';
export type Tier = 'scalable' | 'e5v34' | 'e5v12' | 'entry' | 'legacy';
export type Timeline = 'now' | '30d' | '90d' | 'research';
export type ContactPreference = 'whatsapp' | 'phone' | 'email';

export const UNSURE = 'unsure';

export interface SimState {
  workloads: Workload[];
  otherWorkload: string;
  modality: Modality | null;
  formFactor: FormFactor | null;
  /** Caminho físico: id da plataforma (Tier) · Data center: id do processador · ou 'unsure'. */
  processor: string | null;
  /** Quantidade em GB ('8', '16'…), 'more' ou 'unsure'. */
  memory: string | null;
  /** Data center: id da opção de armazenamento, 'other' ou 'unsure'. */
  storage: string | null;
  /** Caminho físico: 'ssd' | 'hdd' | 'mixed' | 'unsure'. */
  storageType: string | null;
  /** Caminho físico: faixa de capacidade. */
  storageCapacity: string | null;
  /** Data center: quantidade de IPs. */
  ips: string | null;
  services: string[];
  quantity: number;
}

export interface ContactData {
  name: string;
  company: string;
  email: string;
  phone: string;
  preference: ContactPreference;
  timeline: Timeline | '';
  notes: string;
  website: string; // honeypot
}

export interface Option {
  value: string;
  title: string;
  description?: string;
  meta?: string;
  icon?: string;
  group?: string;
  exclusive?: boolean;
}

export interface Notice {
  tone: 'info' | 'warning';
  text: string;
}

export interface StepDef {
  id: StepId;
  label: string;
  title: string;
  lead: string;
}

export type StepId = 'objetivo' | 'modalidade' | 'processador' | 'memoria' | 'armazenamento' | 'servicos' | 'contato';

export interface CatalogVariation {
  ramGb: number;
  priceCents: number | null;
  inStock: boolean;
}

export interface CatalogModel {
  id: number;
  slug: string;
  name: string;
  brand: string;
  formFactor: 'rack' | 'torre';
  tier: Tier;
  sockets: number;
  family: string;
  url: string;
  inStock: boolean;
  minPriceCents: number | null;
  variations: CatalogVariation[];
}

export interface Catalog {
  source: string;
  fetchedAt: string;
  currency: string;
  models: CatalogModel[];
}

export const emptyState = (): SimState => ({
  workloads: [],
  otherWorkload: '',
  modality: null,
  formFactor: null,
  processor: null,
  memory: null,
  storage: null,
  storageType: null,
  storageCapacity: null,
  ips: null,
  services: [],
  quantity: 1,
});
