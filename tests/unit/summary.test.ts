import { describe, expect, it } from 'vitest';
import { emptyContact } from '../../src/simulator/contact';
import { leadDescription, priceInfo, summarize, whatsappMessage } from '../../src/simulator/summary';
import { emptyState, type SimState } from '../../src/simulator/types';
import { catalog } from './fixtures';

const state = (over: Partial<SimState> = {}): SimState => ({ ...emptyState(), ...over });

const physical = state({
  workloads: ['virtualization', 'database'],
  modality: 'buy',
  formFactor: 'rack',
  processor: 'scalable',
  memory: '64',
  storageType: 'ssd',
  storageCapacity: '1to4',
  services: ['warranty', 'consulting'],
});

describe('resumo', () => {
  it('reflete as escolhas e marca pendências', () => {
    const rows = summarize(state({ workloads: ['erp'] }));
    expect(rows[0]).toMatchObject({ label: 'Uso', value: 'Sistemas de gestão e ERP', status: 'set' });
    expect(rows[1]).toMatchObject({ label: 'Modalidade', status: 'pending' });
  });

  it('descreve o caminho físico', () => {
    const rows = summarize(physical);
    expect(rows.map((r) => r.value)).toEqual(['Virtualização, Banco de dados', 'Compra · Rack', 'Intel Xeon Scalable', '64 GB', 'SSD · 1 a 4 TB']);
  });

  it('descreve o data center com IPs e detalhes do processador', () => {
    const rows = summarize(state({ workloads: ['web'], modality: 'datacenter', processor: 'gold-6134', memory: '32', storage: 'ssd-2x960', ips: '2' }));
    expect(rows.find((r) => r.label === 'Processador')).toMatchObject({ value: '2× Xeon Gold 6134', detail: '16 núcleos · 32 threads · 3,2 GHz' });
    expect(rows.find((r) => r.label === 'Armazenamento')?.value).toBe('2 × 960 GB SSD');
    expect(rows.find((r) => r.label === 'IPs')?.value).toBe('2 IPs');
  });

  it('marca escolhas delegadas ao especialista', () => {
    const rows = summarize(state({ workloads: ['unsure'], modality: 'buy', formFactor: 'any', processor: 'unsure', memory: 'unsure' }));
    expect(rows.filter((r) => r.status === 'expert').map((r) => r.label)).toEqual(['Uso', 'Processador', 'Memória']);
  });
});

describe('referência de preço', () => {
  it('usa o preço publicado da variação de memória escolhida', () => {
    const p = priceInfo(physical, catalog);
    expect(p.kind).toBe('published');
    if (p.kind !== 'published') return;
    expect(p.fromCents).toBe(2200000);
    expect(p.models.map((m) => m.name)).toEqual(['Dell PowerEdge R540', 'Dell PowerEdge R740']);
  });

  it('ignora variações sem preço (valor 0 no WooCommerce)', () => {
    const p = priceInfo({ ...physical, memory: '16' }, catalog);
    expect(p.kind === 'published' && p.models.map((m) => m.name)).toEqual(['Dell PowerEdge R540', 'Dell PowerEdge R740']);
  });

  it('usa o menor preço do modelo quando a memória é "Não sei"', () => {
    const p = priceInfo({ ...physical, memory: 'unsure' }, catalog);
    expect(p.kind === 'published' && p.fromCents).toBe(1950000);
  });

  it('não calcula preço para locação nem data center', () => {
    expect(priceInfo({ ...physical, modality: 'rent' }, catalog).kind).toBe('quote');
    expect(priceInfo(state({ modality: 'datacenter', processor: 'gold-6134' }), catalog).kind).toBe('quote');
  });

  it('cai para orçamento quando não há modelo correspondente', () => {
    expect(priceInfo({ ...physical, formFactor: 'torre' }, catalog).kind).toBe('quote');
    expect(priceInfo({ ...physical, memory: 'more' }, catalog).kind).toBe('quote');
  });
});

describe('mensagens para a equipe', () => {
  const contact = { ...emptyContact(), name: 'Ana Souza', company: 'Exemplo Ltda', email: 'ana@exemplo.com.br', phone: '(11) 98765-4321', timeline: '30d' as const, notes: 'Migrar\nERP atual' };

  it('monta a mensagem de WhatsApp com a configuração e sem dados pessoais', () => {
    const msg = whatsappMessage(physical, catalog);
    expect(msg).toContain('• Memória: 64 GB');
    expect(msg).toContain('• Referência publicada: a partir de R$\u00a022.000 (Dell PowerEdge R540 64 GB)');
    expect(msg).not.toContain('Ana');
    expect(whatsappMessage(physical, catalog, 'ERP atual')).toContain('Observações: ERP atual');
  });

  it('monta a descrição do lead em uma linha (campo de texto do Elementor)', () => {
    const d = leadDescription(physical, catalog, contact, { origin: 'google / cpc' });
    expect(d).not.toContain('\n');
    expect(d).toMatch(/^\[Simulador · Servidores dedicados\] Uso: Virtualização, Banco de dados \| Modalidade: Compra · Rack/);
    expect(d).toContain('Serviços: Extensão de garantia, Consultoria e implantação');
    expect(d).toContain('Prazo: Em até 30 dias');
    expect(d).toContain('Observações: Migrar ERP atual');
    expect(d).toContain('Origem: google / cpc');
  });
});
