import { DATACENTER_CPUS, DATACENTER_STORAGE } from '../data/datacenter';
import { memoryOptions, modelsFor, pathOf, serviceOptions, STEPS, TIERS } from './options';
import type { Catalog, Notice, SimState, StepId, Tier } from './types';
import { UNSURE } from './types';

/** Mensagem de erro que impede avançar, ou null quando a etapa está completa. */
export function validateStep(id: StepId, s: SimState): string | null {
  switch (id) {
    case 'objetivo':
      if (s.workloads.length === 0) return 'Escolha pelo menos um uso ou marque "Ainda não sei".';
      if (s.workloads.includes('other') && s.otherWorkload.trim().length < 3) return 'Descreva o outro cenário em poucas palavras.';
      return null;
    case 'modalidade':
      if (!s.modality) return 'Escolha uma modalidade para continuar.';
      if (pathOf(s.modality) === 'physical' && !s.formFactor) return 'Escolha o formato do servidor (ou "Sem preferência").';
      return null;
    case 'processador':
      return s.processor ? null : 'Escolha uma opção de processamento ou "Quero recomendação".';
    case 'memoria':
      return s.memory ? null : 'Escolha a quantidade de memória ou "Não sei".';
    case 'armazenamento':
      if (pathOf(s.modality) === 'datacenter') return s.storage ? null : 'Escolha uma opção de armazenamento ou "Não sei".';
      if (!s.storageType) return 'Escolha o tipo de disco ou "Não sei".';
      if (!s.storageCapacity) return 'Escolha a capacidade aproximada ou "Não sei".';
      return null;
    case 'servicos':
      if (pathOf(s.modality) === 'datacenter' && !s.ips) return 'Escolha a quantidade de IPs.';
      if (!Number.isInteger(s.quantity) || s.quantity < 1) return 'Informe a quantidade de servidores.';
      return null;
    case 'contato':
      return null;
  }
}

export const firstIncompleteStep = (s: SimState): number => {
  const idx = STEPS.findIndex((step) => step.id !== 'contato' && validateStep(step.id, s) !== null);
  return idx === -1 ? STEPS.length - 1 : idx;
};

export const isStepComplete = (id: StepId, s: SimState) => validateStep(id, s) === null;

/**
 * Aplica uma alteração e resolve dependências entre etapas. Devolve avisos
 * para o usuário quando escolhas anteriores precisaram ser reiniciadas.
 */
export function applyChange(prev: SimState, patch: Partial<SimState>, catalog: Catalog): { state: SimState; notices: Notice[] } {
  const next: SimState = { ...prev, ...patch };
  const notices: Notice[] = [];

  // "Ainda não sei" é exclusivo entre os usos.
  if (patch.workloads) {
    const added = patch.workloads.filter((w) => !prev.workloads.includes(w));
    if (added.includes(UNSURE)) next.workloads = [UNSURE];
    else if (next.workloads.length > 1) next.workloads = next.workloads.filter((w) => w !== UNSURE);
    if (!next.workloads.includes('other')) next.otherWorkload = '';
  }

  if (patch.modality !== undefined && patch.modality !== prev.modality) {
    const before = pathOf(prev.modality);
    const after = pathOf(next.modality);

    if (before && after && before !== after) {
      const hadHardware = prev.processor || prev.storage || prev.storageType || prev.storageCapacity;
      next.processor = null;
      next.storage = null;
      next.storageType = null;
      next.storageCapacity = null;
      if (hadHardware) {
        notices.push({
          tone: 'info',
          text:
            after === 'datacenter'
              ? 'O data center tem um catálogo próprio de processadores e discos. Essas escolhas foram reiniciadas.'
              : 'O servidor físico tem um catálogo próprio de plataformas e discos. Essas escolhas foram reiniciadas.',
        });
      }
    }
    // "Mais de 64 GB" (data center) e "Mais de 128 GB" (físico) não são a mesma escolha.
    if (before !== after && next.memory === 'more') next.memory = null;
    if (after === 'datacenter') {
      next.formFactor = null;
      next.ips = next.ips ?? '1';
    } else {
      next.ips = null;
    }

    const allowed = new Set(serviceOptions(next.modality).map((o) => o.value));
    const dropped = next.services.filter((v) => !allowed.has(v));
    if (dropped.length) {
      next.services = next.services.filter((v) => allowed.has(v));
      notices.push({
        tone: 'info',
        text: dropped.includes('warranty') && next.modality === 'rent'
          ? 'Extensão de garantia não se aplica à locação e foi removida dos serviços.'
          : 'Alguns serviços não se aplicam à nova modalidade e foram removidos.',
      });
    }
  }

  // Memória fora das opções do novo caminho volta a ficar pendente.
  if (next.memory && !memoryOptions(next, catalog).some((o) => o.value === next.memory)) {
    next.memory = null;
    notices.push({ tone: 'info', text: 'A quantidade de memória escolhida não existe neste catálogo. Escolha novamente.' });
  }

  return { state: next, notices };
}

/** Alertas de compatibilidade exibidos na etapa correspondente (não bloqueiam). */
export function warningsFor(id: StepId, s: SimState, catalog: Catalog): Notice[] {
  const out: Notice[] = [];
  const path = pathOf(s.modality);
  const cpu = path === 'datacenter' ? DATACENTER_CPUS.find((c) => c.id === s.processor) : undefined;

  if (id === 'memoria' && cpu?.generation === 'e3' && (s.memory === '64' || s.memory === 'more')) {
    out.push({
      tone: 'warning',
      text: 'O Xeon E3-1200 suporta até 32 GB na maior parte das gerações. Para 64 GB ou mais, considere um Xeon E5 ou Scalable. Se mantiver esta escolha, o especialista confirma se é viável.',
    });
  }

  if (id === 'armazenamento' && path === 'datacenter') {
    const disk = DATACENTER_STORAGE.find((d) => d.id === s.storage);
    if (disk?.media === 'nvme' && (cpu?.generation === 'e5v2' || cpu?.generation === 'e3')) {
      out.push({
        tone: 'warning',
        text: 'Discos NVMe dependem do suporte do chassi. Com Xeon E5 v2 ou E3, a disponibilidade precisa ser confirmada pelo especialista. SSD é a alternativa garantida.',
      });
    }
  }

  if (path === 'physical' && id === 'memoria' && s.memory && /^\d+$/.test(s.memory)) {
    const tier = s.processor && s.processor !== UNSURE ? (s.processor as Tier) : null;
    const count = modelsFor(catalog, { tier, formFactor: s.formFactor, ramGb: Number(s.memory) }).length;
    if (count === 0) {
      out.push({
        tone: 'info',
        text: `Nenhum equipamento${tier ? ` ${TIERS[tier].title}` : ''} do catálogo ${s.modality === 'rent' ? 'tem' : 'tem preço publicado com'} ${s.memory} GB neste formato. A configuração continua válida e será orçada sob medida.`,
      });
    }
  }

  if (path === 'physical' && id === 'processador' && (s.processor === 'entry' || s.processor === 'legacy')) {
    if (s.workloads.some((w) => w === 'virtualization' || w === 'database')) {
      out.push({
        tone: 'info',
        text: 'Para virtualização e bancos de dados, plataformas com dois processadores e memória DDR4 (Xeon E5 v3/v4 ou Scalable) costumam deixar mais margem para crescer.',
      });
    }
  }

  return out;
}

/** Orientações curtas, ligadas aos usos escolhidos na primeira etapa. */
export function tipsFor(id: StepId, s: SimState): string[] {
  const has = (w: string) => s.workloads.includes(w as never);
  const tips: string[] = [];
  if (id === 'processador') {
    if (has('virtualization')) tips.push('Virtualização se beneficia de mais núcleos: cada máquina virtual recebe uma parte dos núcleos disponíveis.');
    if (has('database')) tips.push('Bancos de dados com muitas consultas simultâneas pedem mais núcleos; consultas pesadas e isoladas se beneficiam de frequência mais alta.');
    if (has('files') && tips.length === 0) tips.push('Para arquivos e backup, o processador raramente é o gargalo. Disco e rede pesam mais.');
  }
  if (id === 'memoria') {
    if (has('database')) tips.push('No banco de dados, a memória funciona como cache: quanto mais dados cabem na RAM, menos leituras em disco.');
    if (has('virtualization')) tips.push('Some a memória de todas as máquinas virtuais planejadas e reserve uma margem para o hipervisor.');
    if (has('erp')) tips.push('ERPs costumam rodar aplicação e banco no mesmo servidor. Considere a memória dos dois.');
  }
  if (id === 'armazenamento') {
    if (has('database')) tips.push('SSD e NVMe reduzem o tempo de leitura e gravação, o que aparece diretamente na resposta do banco de dados.');
    if (has('files')) tips.push('Para arquivos e backup, a capacidade costuma pesar mais que a velocidade. O HDD oferece mais espaço pelo mesmo investimento.');
    tips.push('Com dois discos iguais é possível espelhar os dados (RAID 1). O arranjo é definido com o especialista.');
  }
  if (tips.length === 0 && (id === 'processador' || id === 'memoria')) {
    tips.push('Na dúvida, escolha a opção de recomendação. O especialista dimensiona a partir do seu uso.');
  }
  return tips.slice(0, 2);
}
