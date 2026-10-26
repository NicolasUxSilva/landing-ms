// Catálogo do servidor dedicado em data center, extraído do configurador
// publicado em https://msserver.com.br/servidores-dedicados/ (versão com modelos
// de processador). Núcleos, threads e frequência base foram conferidos com a
// especificação da Intel; correções estão marcadas em `correction` e listadas
// em docs/DADOS-E-DIVERGENCIAS.md. Não há preços publicados para esta modalidade.

export type CpuGeneration = 'scalable-3' | 'scalable-1' | 'e5v4' | 'e5v3' | 'e5v2' | 'e3';

export interface DatacenterCpu {
  id: string;
  label: string;
  cores: number;
  threads: number;
  baseGhz: string;
  generation: CpuGeneration;
  correction?: string;
}

export const CPU_GENERATIONS: Record<CpuGeneration, { label: string; hint: string }> = {
  'scalable-3': { label: 'Xeon Scalable 3ª geração', hint: 'Geração mais recente da lista, com memória DDR4 e PCIe 4.0.' },
  'scalable-1': { label: 'Xeon Scalable 1ª geração', hint: 'Plataforma Scalable com memória DDR4 e mais canais de memória que a família E5.' },
  e5v4: { label: 'Xeon E5 v4', hint: 'Muitos núcleos por investimento, memória DDR4.' },
  e5v3: { label: 'Xeon E5 v3', hint: 'Primeira geração E5 com memória DDR4.' },
  e5v2: { label: 'Xeon E5 v2', hint: 'Geração anterior, memória DDR3. Atende cargas moderadas.' },
  e3: { label: 'Xeon E3', hint: 'Processador único, indicado para cargas leves.' },
};

export const DATACENTER_CPUS: DatacenterCpu[] = [
  { id: 'silver-4314', label: '2× Intel Xeon Silver 4314', cores: 32, threads: 64, baseGhz: '2,4', generation: 'scalable-3' },
  { id: 'platinum-8176', label: '2× Intel Xeon Platinum 8176', cores: 56, threads: 112, baseGhz: '2,1', generation: 'scalable-1' },
  {
    id: 'gold-6138',
    label: '2× Intel Xeon Gold 6138',
    cores: 40,
    threads: 80,
    baseGhz: '2,0',
    generation: 'scalable-1',
    correction: 'Publicado como 44 núcleos / 88 threads. O Xeon Gold 6138 tem 20 núcleos por processador (40 / 80 com dois).',
  },
  { id: 'gold-6134', label: '2× Intel Xeon Gold 6134', cores: 16, threads: 32, baseGhz: '3,2', generation: 'scalable-1' },
  { id: 'e5-2696v4', label: '2× Intel Xeon E5-2696 v4', cores: 44, threads: 88, baseGhz: '2,2', generation: 'e5v4' },
  { id: 'e5-2690v4', label: '2× Intel Xeon E5-2690 v4', cores: 28, threads: 56, baseGhz: '2,6', generation: 'e5v4' },
  {
    id: 'e5-2680v3',
    label: '2× Intel Xeon E5-2680 v3',
    cores: 24,
    threads: 48,
    baseGhz: '2,5',
    generation: 'e5v3',
    correction: 'Publicado com 2,0 GHz. A frequência base do Xeon E5-2680 v3 é 2,5 GHz.',
  },
  { id: 'e5-2697v2', label: '2× Intel Xeon E5-2697 v2', cores: 24, threads: 48, baseGhz: '2,7', generation: 'e5v2' },
  { id: 'e5-2680v2', label: '2× Intel Xeon E5-2680 v2', cores: 20, threads: 40, baseGhz: '2,8', generation: 'e5v2' },
  { id: 'e5-2650v2', label: '2× Intel Xeon E5-2650 v2', cores: 16, threads: 32, baseGhz: '2,6', generation: 'e5v2' },
  { id: 'e3-1200', label: '1× Intel Xeon E3-1200', cores: 4, threads: 8, baseGhz: '3,0', generation: 'e3' },
];

export const DATACENTER_MEMORY = [16, 32, 64] as const;

export type StorageMedia = 'ssd' | 'nvme' | 'hdd';

export interface DatacenterStorage {
  id: string;
  disks: number;
  sizeGb: number;
  media: StorageMedia;
}

export const DATACENTER_STORAGE: DatacenterStorage[] = [
  { id: 'ssd-2x480', disks: 2, sizeGb: 480, media: 'ssd' },
  { id: 'ssd-2x960', disks: 2, sizeGb: 960, media: 'ssd' },
  { id: 'ssd-2x1920', disks: 2, sizeGb: 1920, media: 'ssd' },
  { id: 'ssd-2x3840', disks: 2, sizeGb: 3840, media: 'ssd' },
  { id: 'ssd-2x7680', disks: 2, sizeGb: 7680, media: 'ssd' },
  { id: 'nvme-2x1000', disks: 2, sizeGb: 1000, media: 'nvme' },
  { id: 'nvme-2x2000', disks: 2, sizeGb: 2000, media: 'nvme' },
  { id: 'nvme-2x4000', disks: 2, sizeGb: 4000, media: 'nvme' },
  { id: 'hdd-1x10000', disks: 1, sizeGb: 10000, media: 'hdd' },
  { id: 'hdd-1x20000', disks: 1, sizeGb: 20000, media: 'hdd' },
];

export const DATACENTER_IPS = [1, 2, 3, 4, 5, 6] as const;

export const MEDIA_LABEL: Record<StorageMedia, string> = { ssd: 'SSD', nvme: 'NVMe', hdd: 'HDD' };

export const formatCapacity = (gb: number) =>
  gb >= 1000 && gb % 1000 === 0 ? `${gb / 1000} TB` : `${gb.toLocaleString('pt-BR')} GB`;

export const storageLabel = (s: DatacenterStorage) =>
  `${s.disks > 1 ? `${s.disks} × ` : ''}${formatCapacity(s.sizeGb)} ${MEDIA_LABEL[s.media]}`;
