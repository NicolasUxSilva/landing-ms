import { describe, expect, it } from 'vitest';
import { memoryOptions, processorOptions, serviceOptions } from '../../src/simulator/options';
import { applyChange, firstIncompleteStep, tipsFor, validateStep, warningsFor } from '../../src/simulator/rules';
import { emptyState, type SimState } from '../../src/simulator/types';
import { catalog } from './fixtures';

const state = (over: Partial<SimState> = {}): SimState => ({ ...emptyState(), ...over });

describe('validação das etapas', () => {
  it('exige ao menos um uso e descrição para "Outro"', () => {
    expect(validateStep('objetivo', state())).toMatch(/pelo menos um uso/);
    expect(validateStep('objetivo', state({ workloads: ['other'] }))).toMatch(/Descreva/);
    expect(validateStep('objetivo', state({ workloads: ['other'], otherWorkload: 'Servidor de CFTV' }))).toBeNull();
    expect(validateStep('objetivo', state({ workloads: ['unsure'] }))).toBeNull();
  });

  it('exige formato apenas para servidor físico', () => {
    expect(validateStep('modalidade', state({ modality: 'buy' }))).toMatch(/formato/);
    expect(validateStep('modalidade', state({ modality: 'buy', formFactor: 'any' }))).toBeNull();
    expect(validateStep('modalidade', state({ modality: 'datacenter' }))).toBeNull();
  });

  it('valida armazenamento conforme o caminho', () => {
    expect(validateStep('armazenamento', state({ modality: 'datacenter' }))).not.toBeNull();
    expect(validateStep('armazenamento', state({ modality: 'datacenter', storage: 'ssd-2x960' }))).toBeNull();
    expect(validateStep('armazenamento', state({ modality: 'buy', storageType: 'ssd' }))).toMatch(/capacidade/);
    expect(validateStep('armazenamento', state({ modality: 'buy', storageType: 'ssd', storageCapacity: '1to4' }))).toBeNull();
  });

  it('exige IPs apenas no data center', () => {
    expect(validateStep('servicos', state({ modality: 'datacenter' }))).toMatch(/IPs/);
    expect(validateStep('servicos', state({ modality: 'buy' }))).toBeNull();
    expect(validateStep('servicos', state({ modality: 'buy', quantity: 0 }))).toMatch(/quantidade/);
  });

  it('encontra a primeira etapa incompleta', () => {
    expect(firstIncompleteStep(state())).toBe(0);
    expect(firstIncompleteStep(state({ workloads: ['erp'], modality: 'datacenter' }))).toBe(2);
  });
});

describe('dependências entre escolhas', () => {
  it('"Ainda não sei" é exclusivo entre os usos', () => {
    let s = applyChange(state({ workloads: ['erp'] }), { workloads: ['erp', 'unsure'] }, catalog).state;
    expect(s.workloads).toEqual(['unsure']);
    s = applyChange(s, { workloads: ['unsure', 'database'] }, catalog).state;
    expect(s.workloads).toEqual(['database']);
  });

  it('limpa a descrição de "Outro" quando o uso é desmarcado', () => {
    const s = applyChange(state({ workloads: ['other'], otherWorkload: 'CFTV' }), { workloads: [] }, catalog).state;
    expect(s.otherWorkload).toBe('');
  });

  it('reinicia hardware ao trocar entre físico e data center, com aviso', () => {
    const before = state({ workloads: ['erp'], modality: 'buy', formFactor: 'rack', processor: 'scalable', memory: '128', storageType: 'ssd', storageCapacity: '1to4' });
    const { state: s, notices } = applyChange(before, { modality: 'datacenter' }, catalog);
    expect(s.processor).toBeNull();
    expect(s.storageType).toBeNull();
    expect(s.formFactor).toBeNull();
    expect(s.ips).toBe('1');
    expect(s.memory).toBeNull(); // 128 GB não existe no catálogo de data center
    expect(notices.map((n) => n.text).join(' ')).toMatch(/reiniciadas/);
  });

  it('"Mais de" volta a ficar pendente ao trocar de caminho', () => {
    const s = applyChange(state({ modality: 'datacenter', memory: 'more' }), { modality: 'buy' }, catalog).state;
    expect(s.memory).toBeNull();
  });

  it('mantém escolhas ao trocar entre compra e locação, removendo a garantia estendida', () => {
    const before = state({ modality: 'buy', formFactor: 'rack', processor: 'scalable', memory: '64', services: ['warranty', 'consulting'] });
    const { state: s, notices } = applyChange(before, { modality: 'rent' }, catalog);
    expect(s.processor).toBe('scalable');
    expect(s.memory).toBe('64');
    expect(s.services).toEqual(['consulting']);
    expect(notices[0].text).toMatch(/garantia/);
  });

  it('oferece serviços diferentes por modalidade', () => {
    expect(serviceOptions('buy').map((o) => o.value)).toContain('warranty');
    expect(serviceOptions('rent').map((o) => o.value)).not.toContain('warranty');
    expect(serviceOptions('datacenter').map((o) => o.value)).toEqual(expect.arrayContaining(['vpn', 'firewall', 'daily-backup']));
  });
});

describe('opções dependentes do catálogo', () => {
  it('mostra plataformas com contagem e preço inicial por formato', () => {
    const opts = processorOptions(state({ modality: 'buy', formFactor: 'torre' }), catalog);
    expect(opts.find((o) => o.value === 'e5v34')?.meta).toBe('1 modelo · a partir de R$\u00a012.850');
    expect(opts.find((o) => o.value === 'scalable')?.meta).toBe('Sob consulta neste formato');
    expect(opts.at(-1)?.value).toBe('unsure');
  });

  it('lista os processadores do data center com núcleos corrigidos', () => {
    const opts = processorOptions(state({ modality: 'datacenter' }), catalog);
    expect(opts.find((o) => o.value === 'gold-6138')?.meta).toBe('40 núcleos · 80 threads · 2,0 GHz');
  });

  it('na locação mostra disponibilidade, sem preço de compra', () => {
    const opts = processorOptions(state({ modality: 'rent', formFactor: 'torre' }), catalog);
    expect(opts.find((o) => o.value === 'e5v34')?.meta).toBe('1 modelo no catálogo');
    const mem = memoryOptions(state({ modality: 'rent', formFactor: 'rack', processor: 'scalable' }), catalog);
    expect(mem.find((o) => o.value === '64')?.meta).toBe('2 modelos no catálogo');
  });

  it('conta modelos com preço por memória', () => {
    const opts = memoryOptions(state({ modality: 'buy', formFactor: 'rack', processor: 'scalable' }), catalog);
    expect(opts.find((o) => o.value === '64')?.meta).toBe('2 modelos com preço');
    expect(opts.find((o) => o.value === '8')?.meta).toBe('Sob consulta');
  });
});

describe('alertas de compatibilidade', () => {
  it('alerta E3 com 64 GB', () => {
    const w = warningsFor('memoria', state({ modality: 'datacenter', processor: 'e3-1200', memory: '64' }), catalog);
    expect(w[0]?.tone).toBe('warning');
  });

  it('alerta NVMe com Xeon E5 v2', () => {
    const w = warningsFor('armazenamento', state({ modality: 'datacenter', processor: 'e5-2680v2', storage: 'nvme-2x1000' }), catalog);
    expect(w[0]?.text).toMatch(/NVMe/);
    expect(warningsFor('armazenamento', state({ modality: 'datacenter', processor: 'gold-6134', storage: 'nvme-2x1000' }), catalog)).toHaveLength(0);
  });

  it('informa quando não há preço publicado para a memória escolhida', () => {
    const w = warningsFor('memoria', state({ modality: 'buy', formFactor: 'torre', processor: 'e5v34', memory: '64' }), catalog);
    expect(w[0]?.text).toMatch(/sob medida/);
  });

  it('orienta virtualização em plataforma de entrada', () => {
    const w = warningsFor('processador', state({ workloads: ['virtualization'], modality: 'buy', formFactor: 'rack', processor: 'entry' }), catalog);
    expect(w).toHaveLength(1);
  });

  it('gera dicas a partir dos usos', () => {
    expect(tipsFor('memoria', state({ workloads: ['database'] }))[0]).toMatch(/cache/);
    expect(tipsFor('processador', state({ workloads: ['erp'] }))[0]).toMatch(/recomendação/);
  });
});
