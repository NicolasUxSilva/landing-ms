import catalogJson from '../data/catalog.json';
import { CPU_GENERATIONS } from '../data/datacenter';
import { CONTACT, LEAD, whatsappUrl } from '../config/site';
import { resetTracking, track } from './analytics';
import { emptyContact, formatPhone, validateContact, validateField, type ContactField } from './contact';
import { submitLead } from './lead';
import {
  brl,
  datacenterStorageOptions,
  FORM_FACTORS,
  ipOptions,
  memoryOptions,
  MODALITIES,
  pathOf,
  processorOptions,
  serviceOptions,
  STEPS,
  STORAGE_CAPACITIES,
  STORAGE_TYPES,
  TIERS,
  WORKLOADS,
} from './options';
import { applyChange, firstIncompleteStep, tipsFor, validateStep, warningsFor } from './rules';
import { leadDescription, priceInfo, servicesText, specializedLaborAnswer, summarize, type SummaryRow, whatsappMessage } from './summary';
import type { Catalog, ContactData, Notice, Option, SimState, StepId, Workload } from './types';
import { emptyState } from './types';

const catalog = catalogJson as Catalog;
const STORAGE_KEY = 'msserver-simulador-v1';
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const catalogDate = new Date(catalog.fetchedAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

// ——— Pequeno utilitário de DOM ———

type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;

function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

function icon(name: string, size = 20, cls = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', `icon ${name === 'whatsapp' ? 'si--fill' : ''} ${cls}`.trim());
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#sim-i-${name}`);
  svg.append(use);
  return svg;
}

let uid = 0;
const nextId = (p: string) => `${p}-${++uid}`;

// ——— Persistência local (somente a configuração; nunca dados pessoais) ———

interface Saved {
  state: SimState;
  step: number;
  maxStep: number;
}

function load(): Saved | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    if (!saved?.state || typeof saved.step !== 'number') return null;
    return { state: { ...emptyState(), ...saved.state }, step: saved.step, maxStep: saved.maxStep ?? saved.step };
  } catch {
    return null;
  }
}

function persist(data: Saved | null) {
  try {
    if (data) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* armazenamento indisponível: o simulador segue funcionando em memória */
  }
}

// ——— Controlador ———

export function initSimulator(root: HTMLElement) {
  const els = {
    steps: root.querySelector<HTMLOListElement>('[data-steps]')!,
    progressText: root.querySelector<HTMLElement>('[data-progress-text]')!,
    progressBar: root.querySelector<HTMLElement>('[data-progress-bar]')!,
    stage: root.querySelector<HTMLElement>('[data-stage]')!,
    nav: root.querySelector<HTMLElement>('[data-nav]')!,
    prev: root.querySelector<HTMLButtonElement>('[data-prev]')!,
    next: root.querySelector<HTMLButtonElement>('[data-next]')!,
    nextMobile: root.querySelector<HTMLButtonElement>('[data-next-mobile]')!,
    summaryRoot: root.querySelector<HTMLElement>('[data-summary-root]')!,
    summaryList: root.querySelector<HTMLElement>('[data-summary-list]')!,
    summaryCount: root.querySelector<HTMLElement>('[data-summary-count]')!,
    mobileCount: root.querySelector<HTMLElement>('[data-mobile-count]')!,
    price: root.querySelector<HTMLElement>('[data-price]')!,
    summaryActions: root.querySelector<HTMLElement>('[data-summary-actions]')!,
    sheet: root.querySelector<HTMLDialogElement>('[data-sheet]')!,
    sheetBody: root.querySelector<HTMLElement>('[data-sheet-body]')!,
    mobilebar: root.querySelector<HTMLElement>('[data-mobilebar]')!,
    main: root.querySelector<HTMLElement>('.sim-main')!,
  };

  const saved = load();
  let state: SimState = saved?.state ?? emptyState();
  let current = saved ? Math.min(saved.step, firstIncompleteStep(saved.state)) : 0;
  let maxStep = saved ? Math.max(current, Math.min(saved.maxStep, firstIncompleteStep(saved.state))) : 0;
  let contact: ContactData = emptyContact();
  const touched = new Set<ContactField>();
  let pendingNotices: Notice[] = saved && (saved.state.workloads.length > 0 || saved.step > 0)
    ? [{ tone: 'info', text: 'Retomamos a simulação de onde você parou.' }]
    : [];
  let started = !!saved;
  let submitting = false;
  let submitResult: null | { ok: true; message: string } | { ok: false; message: string } = null;

  const step = () => STEPS[current];
  const save = () => persist({ state, step: current, maxStep });

  function markStarted(entry: string) {
    if (started) return;
    started = true;
    track('simulation_start', { entry });
  }

  /** Aplica uma escolha. Com `render: false`, quem chamou redesenha a etapa (os avisos ficam pendentes). */
  function update(patch: Partial<SimState>, opts: { render?: boolean } = {}) {
    markStarted('interacao');
    const { state: next, notices } = applyChange(state, patch, catalog);
    state = next;
    if (notices.length) pendingNotices.push(...notices);
    save();
    if (opts.render === false) return;
    syncStep();
    renderSummary();
    renderProgress();
  }

  // ——— Progresso ———

  function canVisit(i: number) {
    // Durante o envio e depois da confirmação, a navegação fica travada.
    if (submitting || submitResult?.ok) return false;
    return i <= maxStep && STEPS.slice(0, i).every((s) => validateStep(s.id, state) === null);
  }

  function renderProgress() {
    els.steps.querySelectorAll<HTMLButtonElement>('[data-goto]').forEach((btn) => {
      const i = Number(btn.dataset.goto);
      const done = i !== current && i < STEPS.length - 1 && validateStep(STEPS[i].id, state) === null && i <= maxStep;
      btn.disabled = i !== current && !canVisit(i);
      btn.classList.toggle('is-current', i === current);
      btn.classList.toggle('is-done', done);
      if (i === current) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
      const status = btn.querySelector('[data-step-status]');
      if (status) status.textContent = done ? ', concluída' : '';
    });
    els.progressText.textContent = `Etapa ${current + 1} de ${STEPS.length} · ${step().label}`;
    els.progressBar.style.width = `${((current + 1) / STEPS.length) * 100}%`;
  }

  // ——— Navegação ———

  function goTo(i: number, opts: { focus?: boolean; scroll?: boolean } = {}) {
    if (submitting) return;
    current = Math.max(0, Math.min(STEPS.length - 1, i));
    maxStep = Math.max(maxStep, current);
    save();
    renderStep();
    renderProgress();
    renderSummary();
    if (opts.scroll !== false) scrollToSim();
    if (opts.focus !== false) els.stage.querySelector<HTMLElement>('.sim-step-title')?.focus({ preventScroll: true });
    if (step().id === 'contato') {
      const allDone = STEPS.slice(0, -1).every((s) => validateStep(s.id, state) === null);
      if (allDone) track('simulation_complete', { sim_path: pathOf(state.modality) ?? '' }, { once: true });
    }
  }

  function scrollToSim() {
    const top = els.main.getBoundingClientRect().top;
    const header = 88;
    if (top < header || top > window.innerHeight * 0.6) {
      window.scrollTo({ top: window.scrollY + top - header, behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
  }

  function next() {
    const error = validateStep(step().id, state);
    const box = els.stage.querySelector<HTMLElement>('[data-error]');
    if (error) {
      if (box) {
        box.textContent = error;
        box.hidden = false;
      }
      focusMissing();
      return;
    }
    track('simulation_step_complete', { step_id: step().id, step_number: current + 1, sim_path: pathOf(state.modality) ?? '' }, { once: true });
    goTo(current + 1);
  }

  /** Leva o foco ao primeiro controle que falta preencher na etapa atual. */
  function focusMissing() {
    const other = els.stage.querySelector<HTMLInputElement>('[data-other-input]');
    if (other && !other.closest('[hidden]') && state.workloads.includes('other') && other.value.trim().length < 3) {
      other.focus();
      return;
    }
    for (const fs of els.stage.querySelectorAll<HTMLElement>('fieldset[data-group-key]:not([hidden])')) {
      const val = state[fs.dataset.groupKey as keyof SimState];
      if (val === null || (Array.isArray(val) && val.length === 0)) {
        fs.querySelector<HTMLInputElement>('input')?.focus();
        return;
      }
    }
  }

  els.prev.addEventListener('click', () => goTo(current - 1));
  els.next.addEventListener('click', next);
  els.nextMobile.addEventListener('click', next);
  els.steps.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-goto]');
    if (btn && !btn.disabled) goTo(Number(btn.dataset.goto));
  });

  // ——— Etapas ———

  function stepLead(id: StepId): string {
    const dc = pathOf(state.modality) === 'datacenter';
    switch (id) {
      case 'processador':
        return dc
          ? 'Processadores disponíveis para o servidor dedicado em data center, com núcleos, threads e frequência base por servidor.'
          : 'Escolha a geração da plataforma. A contagem mostra os modelos com preço publicado no formato escolhido.';
      case 'memoria':
        return dc
          ? 'Capacidades disponíveis no data center. Acima de 64 GB, a equipe monta sob consulta.'
          : 'Opções de memória do catálogo. A contagem considera a plataforma e o formato escolhidos.';
      case 'armazenamento':
        return dc
          ? 'Opções de armazenamento do servidor em data center.'
          : 'Indique o tipo de disco e a capacidade aproximada. Discos e arranjo RAID são definidos na proposta, conforme as baias do modelo.';
      case 'servicos':
        return dc ? 'Defina a quantidade de IPs e, se quiser, serviços adicionais. Os serviços são orçados à parte.' : STEPS[current].lead;
      default:
        return STEPS.find((s) => s.id === id)!.lead;
    }
  }

  function renderStep() {
    const s = step();
    const titleId = nextId('sim-title');
    const head = h(
      'header',
      { class: 'sim-step-head' },
      h('p', { class: 'sim-step-kicker' }, `Etapa ${current + 1} de ${STEPS.length}`),
      h('h3', { class: 'sim-step-title', id: titleId, tabindex: -1 }, s.title),
      stepLead(s.id) ? h('p', { class: 'sim-step-lead' }, stepLead(s.id)) : null,
    );
    const notices = h('div', { class: 'sim-notices', 'data-notices': true, role: 'status', 'aria-live': 'polite' });
    const body = h('div', { class: 'sim-step-body' });

    switch (s.id) {
      case 'objetivo':
        body.append(buildObjective());
        break;
      case 'modalidade':
        body.append(...buildModality());
        break;
      case 'processador':
        body.append(buildProcessor());
        break;
      case 'memoria':
        body.append(buildChoice('memory', 'Memória RAM', memoryOptions(state, catalog), 'chips'));
        break;
      case 'armazenamento':
        body.append(...buildStorage());
        break;
      case 'servicos':
        body.append(...buildServices());
        break;
      case 'contato':
        body.append(buildContact());
        break;
    }

    const extras = h(
      'div',
      { class: 'sim-extras' },
      h('div', { class: 'sim-warnings', 'data-warnings': true, 'aria-live': 'polite' }),
      h('div', { class: 'sim-tips', 'data-tips': true }),
      h('p', { class: 'sim-error', 'data-error': true, role: 'alert', hidden: true }),
    );

    const panel = h('div', { class: 'sim-panel', role: 'group', 'aria-labelledby': titleId }, head, notices, body, extras);
    if (!reducedMotion()) panel.classList.add('is-entering');
    els.stage.replaceChildren(panel);
    requestAnimationFrame(() => panel.classList.remove('is-entering'));

    els.nav.hidden = false;
    els.prev.hidden = current === 0;
    const last = s.id === 'contato';
    els.next.hidden = last;
    els.nextMobile.hidden = last;
    root.classList.toggle('is-last-step', last);
    root.classList.toggle('is-first-step', current === 0);
    syncStep();
  }

  /** Atualiza o estado visual da etapa atual sem recriar o DOM (mantém o foco). */
  function syncStep() {
    const s = step();
    els.stage.querySelectorAll<HTMLInputElement>('input[data-key]').forEach((input) => {
      const key = input.dataset.key as keyof SimState;
      const val = state[key];
      if (input.type === 'checkbox') input.checked = Array.isArray(val) && (val as string[]).includes(input.value);
      else if (input.type === 'radio') input.checked = val === input.value;
    });
    els.stage.querySelectorAll<HTMLElement>('[data-show-when]').forEach((el) => {
      const [key, values] = el.dataset.showWhen!.split('=');
      const val = state[key as keyof SimState];
      const show = Array.isArray(val) ? values.split('|').some((v) => (val as string[]).includes(v)) : values.split('|').includes(String(val));
      el.hidden = !show;
    });
    const qty = els.stage.querySelector<HTMLInputElement>('[data-quantity]');
    if (qty && document.activeElement !== qty) qty.value = String(state.quantity);
    const other = els.stage.querySelector<HTMLInputElement>('[data-other-input]');
    if (other && document.activeElement !== other) other.value = state.otherWorkload;

    const noticesBox = els.stage.querySelector<HTMLElement>('[data-notices]');
    if (noticesBox && pendingNotices.length) {
      noticesBox.replaceChildren(...pendingNotices.map(noticeEl));
      pendingNotices = [];
    }
    const warnBox = els.stage.querySelector<HTMLElement>('[data-warnings]');
    warnBox?.replaceChildren(...warningsFor(s.id, state, catalog).map(noticeEl));
    const tipsBox = els.stage.querySelector<HTMLElement>('[data-tips]');
    if (tipsBox) {
      const tips = tipsFor(s.id, state);
      tipsBox.replaceChildren(
        ...tips.map((t) => h('p', { class: 'sim-tip' }, icon('lightbulb', 18), h('span', {}, t))),
      );
    }
    const err = els.stage.querySelector<HTMLElement>('[data-error]');
    if (err && !err.hidden && validateStep(s.id, state) === null) err.hidden = true;

    if (s.id === 'contato') syncContact();
  }

  function noticeEl(n: Notice) {
    return h('p', { class: `sim-notice sim-notice--${n.tone}` }, icon(n.tone === 'warning' ? 'triangle-alert' : 'info', 18), h('span', {}, n.text));
  }

  // Grupo de opções (radio ou checkbox) com cartões acessíveis.
  function buildChoice(
    key: keyof SimState,
    legend: string,
    options: Option[],
    variant: 'cards' | 'chips' | 'rows' = 'cards',
    opts: { multiple?: boolean; showLegend?: boolean; hint?: string } = {},
  ) {
    const name = nextId(String(key));
    const fieldset = h('fieldset', { class: `sim-group sim-group--${variant}`, 'data-group-key': String(key) });
    fieldset.append(h('legend', { class: opts.showLegend ? 'sim-legend' : 'sr-only' }, legend));
    if (opts.hint) fieldset.append(h('p', { class: 'sim-hint' }, opts.hint));

    const groups = new Map<string, Option[]>();
    for (const o of options) {
      const g = o.group ?? '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(o);
    }

    for (const [group, list] of groups) {
      const wrap = h('div', { class: 'sim-options' });
      for (const o of list) wrap.append(optionEl(key, name, o, !!opts.multiple));
      if (group) {
        const gen = Object.values(CPU_GENERATIONS).find((g) => g.label === group);
        fieldset.append(
          h('div', { class: 'sim-subgroup' }, h('p', { class: 'sim-subgroup-title' }, group, gen ? h('span', {}, gen.hint) : null), wrap),
        );
      } else fieldset.append(wrap);
    }
    return fieldset;
  }

  function optionEl(key: keyof SimState, name: string, o: Option, multiple: boolean) {
    const id = nextId('opt');
    const descId = o.description || o.meta ? `${id}-d` : undefined;
    const input = h('input', {
      class: 'opt-input',
      type: multiple ? 'checkbox' : 'radio',
      name,
      id,
      value: o.value,
      'data-key': String(key),
      'aria-describedby': descId,
    }) as HTMLInputElement;
    input.addEventListener('change', () => {
      if (multiple) {
        const list = new Set(state[key] as string[]);
        if (input.checked) list.add(o.value);
        else list.delete(o.value);
        update({ [key]: [...list] } as Partial<SimState>);
      } else if (input.checked) {
        update({ [key]: o.value } as Partial<SimState>);
      }
    });
    return h(
      'label',
      { class: 'opt', for: id },
      input,
      h(
        'span',
        { class: 'opt-box' },
        o.icon ? h('span', { class: 'opt-icon' }, icon(o.icon, 20)) : null,
        h(
          'span',
          { class: 'opt-text' },
          h('span', { class: 'opt-title' }, o.title),
          o.description || o.meta
            ? h('span', { id: descId }, o.description ? h('span', { class: 'opt-desc' }, o.description) : null, o.meta ? h('span', { class: 'opt-meta' }, o.meta) : null)
            : null,
        ),
        h('span', { class: 'opt-check', 'aria-hidden': 'true' }, icon('check', 14)),
      ),
    );
  }

  function buildObjective() {
    const frag = h('div', { class: 'sim-stack' }, buildChoice('workloads', 'Usos do servidor', WORKLOADS, 'cards', { multiple: true }));
    const otherId = nextId('other');
    const other = h(
      'div',
      { class: 'sim-field sim-other', 'data-show-when': 'workloads=other' },
      h('label', { for: otherId }, 'Descreva o outro cenário'),
      h('input', {
        id: otherId,
        type: 'text',
        'data-other-input': true,
        maxlength: 120,
        value: state.otherWorkload,
        placeholder: 'Ex.: servidor de CFTV, sistema de telefonia, laboratório',
        oninput: (e: Event) => update({ otherWorkload: (e.target as HTMLInputElement).value }),
      }),
    );
    frag.append(other);
    return frag;
  }

  function buildModality() {
    const ff = buildChoice('formFactor', 'Formato do servidor', FORM_FACTORS, 'cards', { showLegend: true, hint: 'Rack ou torre? Isso filtra os modelos do catálogo.' });
    ff.classList.add('sim-group--compact');
    ff.dataset.showWhen = 'modality=buy|rent|compare';
    return [buildChoice('modality', 'Modalidade de contratação', MODALITIES, 'cards'), ff];
  }

  function buildProcessor() {
    const dc = pathOf(state.modality) === 'datacenter';
    return buildChoice('processor', 'Processamento', processorOptions(state, catalog), dc ? 'rows' : 'cards');
  }

  function buildStorage() {
    if (pathOf(state.modality) === 'datacenter') {
      return [buildChoice('storage', 'Armazenamento', datacenterStorageOptions(), 'rows')];
    }
    return [
      buildChoice('storageType', 'Tipo de disco', STORAGE_TYPES, 'cards', { showLegend: true }),
      buildChoice('storageCapacity', 'Capacidade aproximada', STORAGE_CAPACITIES, 'chips', { showLegend: true }),
    ];
  }

  function buildServices() {
    const out: HTMLElement[] = [];
    if (pathOf(state.modality) === 'datacenter') {
      const ips = buildChoice('ips', 'Quantidade de IPs', ipOptions(), 'chips', { showLegend: true, hint: 'IPs dedicados ao servidor (de 1 a 6).' });
      ips.classList.add('sim-group--ips');
      out.push(ips);
    }
    out.push(buildChoice('services', 'Serviços adicionais (opcionais)', serviceOptions(state.modality), 'cards', { multiple: true, showLegend: true }));

    const qtyId = nextId('qty');
    const setQty = (n: number) => update({ quantity: Math.max(1, Math.min(99, Math.round(n) || 1)) });
    const qtyInput = h('input', {
      id: qtyId,
      type: 'number',
      inputmode: 'numeric',
      min: 1,
      max: 99,
      value: state.quantity,
      'data-quantity': true,
      onchange: (e: Event) => setQty(Number((e.target as HTMLInputElement).value)),
    });
    out.push(
      h(
        'div',
        { class: 'sim-group sim-qty' },
        h('label', { class: 'sim-legend', for: qtyId }, 'Quantidade de servidores com esta configuração'),
        h(
          'div',
          { class: 'sim-stepper' },
          h('button', { type: 'button', class: 'sim-stepper-btn', 'aria-label': 'Diminuir quantidade', onclick: () => setQty(state.quantity - 1) }, icon('minus', 18)),
          qtyInput,
          h('button', { type: 'button', class: 'sim-stepper-btn', 'aria-label': 'Aumentar quantidade', onclick: () => setQty(state.quantity + 1) }, icon('plus', 18)),
        ),
      ),
    );
    return out;
  }

  // ——— Envio ———

  function buildContact() {
    const wrap = h('div', { class: 'sim-contact', 'data-contact': true });
    renderContactInto(wrap);
    return wrap;
  }

  function renderContactInto(wrap: HTMLElement) {
    if (submitResult?.ok) {
      wrap.replaceChildren(successPanel(submitResult.message));
      return;
    }

    const review = h('div', { class: 'sim-review' });
    review.append(h('p', { class: 'sim-review-title' }, 'Configuração'));
    const list = h('dl', { class: 'sim-review-list' });
    const rows = [
      ...summarize(state),
      { step: 'servicos', label: 'Serviços', value: servicesText(state), status: 'set' },
      { step: 'servicos', label: 'Quantidade', value: `${state.quantity} ${state.quantity === 1 ? 'servidor' : 'servidores'}`, status: 'set' },
    ] satisfies SummaryRow[];
    for (const row of rows) {
      const i = STEPS.findIndex((s) => s.id === row.step);
      list.append(
        h(
          'div',
          { class: `sim-review-row is-${row.status}` },
          h('dt', {}, row.label),
          h(
            'dd',
            {},
            h('span', { class: 'sim-review-value' }, row.value, row.detail ? h('small', {}, row.detail) : null),
            h('button', { type: 'button', class: 'sim-edit', onclick: () => goTo(i) }, icon('pencil', 15), 'Alterar', h('span', { class: 'sr-only' }, ` ${row.label.toLowerCase()}`)),
          ),
        ),
      );
    }
    review.append(list);

    const form = h('form', { class: 'sim-form', novalidate: true, 'data-form': true });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void submit();
    });

    const errorSummary = h('div', { class: 'sim-form-errors', 'data-form-errors': true, role: 'alert', tabindex: -1, hidden: true });
    form.append(h('p', { class: 'sim-review-title' }, 'Seus dados'), errorSummary);

    const grid = h('div', { class: 'sim-form-grid' });
    grid.append(
      field('name', 'Nome', { autocomplete: 'name' }),
      field('company', 'Empresa', { autocomplete: 'organization', hint: 'Para a proposta sair em nome da empresa.' }),
      field('email', 'E-mail', { type: 'email', autocomplete: 'email', inputmode: 'email' }),
      field('phone', 'WhatsApp ou telefone', { type: 'tel', autocomplete: 'tel', inputmode: 'tel', placeholder: '(11) 98765-4321' }),
    );
    form.append(grid);

    form.append(
      contactChoice('preference', 'Como prefere ser contatado?', [
        ['whatsapp', 'WhatsApp'],
        ['phone', 'Ligação'],
        ['email', 'E-mail'],
      ]),
      contactChoice('timeline', 'Quando pretende implantar? (opcional)', [
        ['now', 'Imediato'],
        ['30d', 'Em até 30 dias'],
        ['90d', 'Em 1 a 3 meses'],
        ['research', 'Pesquisando'],
      ]),
    );

    const notesId = nextId('notes');
    form.append(
      h(
        'div',
        { class: 'sim-field' },
        h('label', { for: notesId }, 'Observações ', h('span', { class: 'sim-optional' }, '(opcional)')),
        h(
          'textarea',
          {
            id: notesId,
            rows: 3,
            maxlength: 1000,
            placeholder: 'Ex.: sistema atual, número de usuários, configuração específica ou prazo',
            oninput: (e: Event) => {
              contact.notes = (e.target as HTMLTextAreaElement).value;
              refreshWhatsAppLinks();
            },
          },
          contact.notes,
        ),
      ),
    );

    // Honeypot contra spam: invisível para pessoas e leitores de tela.
    form.append(
      h(
        'div',
        { class: 'sim-hp', 'aria-hidden': 'true' },
        h('label', {}, 'Website', h('input', { type: 'text', name: 'website', tabindex: -1, autocomplete: 'off', oninput: (e: Event) => (contact.website = (e.target as HTMLInputElement).value) })),
      ),
    );

    const status = h('div', { class: 'sim-submit-status', 'data-submit-status': true, 'aria-live': 'polite' });
    const actions = h('div', { class: 'sim-form-actions' });
    if (LEAD.mode !== 'disabled') {
      actions.append(
        h('button', { type: 'submit', class: 'btn btn--primary btn--lg', 'data-submit': true }, h('span', { class: 'sim-spinner', 'aria-hidden': 'true' }), h('span', { 'data-submit-label': true }, 'Enviar para um especialista'), icon('send', 18)),
      );
    }
    actions.append(waLink('Enviar pelo WhatsApp', 'simulador-envio', LEAD.mode === 'disabled' ? 'btn btn--primary btn--lg' : 'btn btn--outline btn--lg'));
    form.append(
      actions,
      status,
      h('p', { class: 'sim-privacy' }, 'Usamos estes dados apenas para responder a esta solicitação. Atendimento comercial das 8h às 18h.'),
    );
    if (LEAD.mode === 'mock') {
      form.append(h('p', { class: 'sim-env' }, 'Ambiente de teste: o envio vai para um endpoint local e nenhum dado chega à MSSERVER.'));
    }

    wrap.replaceChildren(review, form);
  }

  function field(name: ContactField, label: string, attrs: Attrs & { hint?: string } = {}) {
    const id = nextId(`f-${name}`);
    const errId = `${id}-err`;
    const hintId = attrs.hint ? `${id}-hint` : undefined;
    const { hint, ...rest } = attrs;
    const input = h('input', {
      id,
      name,
      type: 'text',
      required: true,
      'aria-required': 'true',
      'aria-describedby': [hintId, errId].filter(Boolean).join(' '),
      value: contact[name],
      'data-field': name,
      ...rest,
    }) as HTMLInputElement;
    input.addEventListener('focus', () => track('quote_request_start', {}, { once: true }));
    input.addEventListener('input', () => {
      contact[name] = name === 'phone' ? formatPhone(input.value) : input.value;
      if (name === 'phone' && input.value !== contact.phone) input.value = contact.phone;
      if (touched.has(name)) showFieldError(name);
      refreshWhatsAppLinks();
    });
    input.addEventListener('blur', () => {
      if (input.value.trim()) touched.add(name);
      showFieldError(name);
    });
    return h(
      'div',
      { class: 'sim-field', 'data-field-wrap': name },
      h('label', { for: id }, label, h('span', { class: 'sim-req', 'aria-hidden': 'true' }, ' *')),
      input,
      hint ? h('p', { class: 'sim-field-hint', id: hintId }, String(hint)) : null,
      h('p', { class: 'sim-field-error', id: errId, hidden: true }),
    );
  }

  function showFieldError(name: ContactField) {
    const wrap = els.stage.querySelector<HTMLElement>(`[data-field-wrap="${name}"]`);
    if (!wrap) return;
    const msg = touched.has(name) ? validateField(name, contact) : null;
    const err = wrap.querySelector<HTMLElement>('.sim-field-error')!;
    const input = wrap.querySelector<HTMLInputElement>('input')!;
    err.hidden = !msg;
    err.replaceChildren(...(msg ? [icon('triangle-alert', 14), msg] : []));
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function contactChoice(key: 'preference' | 'timeline', legend: string, opts: [string, string][]) {
    const name = nextId(key);
    const fs = h('fieldset', { class: 'sim-group sim-group--chips sim-group--tight' }, h('legend', { class: 'sim-legend' }, legend));
    const wrap = h('div', { class: 'sim-options' });
    for (const [value, title] of opts) {
      const id = nextId('c');
      const input = h('input', { class: 'opt-input', type: 'radio', name, id, value }) as HTMLInputElement;
      input.checked = contact[key] === value;
      input.addEventListener('change', () => {
        if (input.checked) (contact as unknown as Record<string, string>)[key] = value;
        refreshWhatsAppLinks();
      });
      wrap.append(h('label', { class: 'opt', for: id }, input, h('span', { class: 'opt-box' }, h('span', { class: 'opt-text' }, h('span', { class: 'opt-title' }, title)), h('span', { class: 'opt-check', 'aria-hidden': 'true' }, icon('check', 14)))));
    }
    fs.append(wrap);
    return fs;
  }

  function syncContact() {
    refreshWhatsAppLinks();
  }

  function waLink(label: string, location: string, cls = 'btn btn--outline-dark') {
    const a = h('a', {
      class: cls,
      href: whatsappUrl(whatsappMessage(state, catalog)),
      target: '_blank',
      rel: 'noopener',
      'data-wa-dynamic': true,
      'data-track': 'contact_whatsapp_click',
      'data-track-location': location,
    }, icon('whatsapp', 18, 'wa-icon'), label);
    a.addEventListener('click', () => {
      const status = els.stage.querySelector<HTMLElement>('[data-submit-status]');
      if (status && location === 'simulador-envio') {
        status.replaceChildren(
          h('p', { class: 'sim-notice sim-notice--info' }, icon('info', 18), h('span', {}, 'Abrimos o WhatsApp com a sua configuração. Para concluir, envie a mensagem por lá.')),
        );
      }
    });
    return a;
  }

  function refreshWhatsAppLinks() {
    const href = whatsappUrl(whatsappMessage(state, catalog));
    root.querySelectorAll<HTMLAnchorElement>('[data-wa-dynamic]').forEach((a) => (a.href = href));
  }

  function originInfo() {
    const p = new URLSearchParams(location.search);
    const parts = ['utm_source', 'utm_medium', 'utm_campaign'].map((k) => p.get(k)).filter(Boolean);
    if (p.get('gclid')) parts.push('gclid');
    return parts.join(' / ');
  }

  async function submit() {
    if (submitting) return;
    const errors = validateContact(contact);
    (['name', 'company', 'email', 'phone'] as ContactField[]).forEach((f) => touched.add(f));
    (['name', 'company', 'email', 'phone'] as ContactField[]).forEach(showFieldError);
    const summaryBox = els.stage.querySelector<HTMLElement>('[data-form-errors]')!;
    const keys = Object.keys(errors) as ContactField[];
    if (keys.length) {
      summaryBox.hidden = false;
      summaryBox.replaceChildren(
        h('p', {}, icon('triangle-alert', 18), h('strong', {}, keys.length === 1 ? 'Confira 1 campo:' : `Confira ${keys.length} campos:`)),
        h('ul', {}, ...keys.map((k) => h('li', {}, h('a', { href: '#', onclick: (e: Event) => { e.preventDefault(); els.stage.querySelector<HTMLInputElement>(`[data-field="${k}"]`)?.focus(); } }, errors[k]!)))),
      );
      els.stage.querySelector<HTMLInputElement>(`[data-field="${keys[0]}"]`)?.focus();
      return;
    }
    summaryBox.hidden = true;

    // Todas as etapas anteriores precisam estar completas.
    const missing = firstIncompleteStep(state);
    if (missing < STEPS.length - 1) {
      pendingNotices.push({ tone: 'warning', text: `Falta completar a etapa "${STEPS[missing].label}".` });
      goTo(missing);
      return;
    }

    const btn = els.stage.querySelector<HTMLButtonElement>('[data-submit]');
    const label = els.stage.querySelector<HTMLElement>('[data-submit-label]');
    const status = els.stage.querySelector<HTMLElement>('[data-submit-status]')!;
    submitting = true;
    btn?.setAttribute('aria-busy', 'true');
    if (btn) btn.disabled = true;
    if (label) label.textContent = 'Enviando…';
    status.replaceChildren(h('p', { class: 'sr-only' }, 'Enviando solicitação…'));

    if (contact.website) {
      // Honeypot preenchido: não envia.
      submitting = false;
      if (btn) btn.disabled = false;
      if (label) label.textContent = 'Enviar para um especialista';
      status.replaceChildren(h('p', { class: 'sim-notice sim-notice--warning' }, icon('triangle-alert', 18), h('span', {}, 'Não foi possível enviar. Use o WhatsApp ou o e-mail abaixo.')));
      return;
    }

    const result = await submitLead(
      {
        name: contact.name.trim(),
        company: contact.company.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        description: leadDescription(state, catalog, contact, { origin: originInfo() }),
        specializedLabor: specializedLaborAnswer(state),
        pageUrl: location.href,
      },
      LEAD,
    );

    submitting = false;
    btn?.removeAttribute('aria-busy');
    if (btn) btn.disabled = false;
    if (label) label.textContent = 'Enviar para um especialista';

    if (result.ok) {
      submitResult = result;
      track('quote_request_submit', { sim_path: pathOf(state.modality) ?? '', lead_channel: 'form' });
      persist(null);
      const wrap = els.stage.querySelector<HTMLElement>('[data-contact]');
      if (wrap) renderContactInto(wrap);
      els.prev.hidden = true;
      els.stage.querySelector<HTMLElement>('.sim-success h4')?.focus();
      renderSummary();
      renderProgress();
      return;
    }

    track('quote_request_error', { reason: result.reason });
    const mail = `mailto:${CONTACT.emailCommercial}?subject=${encodeURIComponent('Simulação de servidor dedicado')}&body=${encodeURIComponent(whatsappMessage(state, catalog, contact.notes))}`;
    status.replaceChildren(
      h(
        'div',
        { class: 'sim-send-error', role: 'alert' },
        h('p', { class: 'sim-send-error-title' }, icon('triangle-alert', 18), 'Não conseguimos confirmar o envio'),
        h('p', {}, `${result.message} Seus dados continuam preenchidos: tente novamente ou envie por outro canal.`),
        h(
          'div',
          { class: 'sim-send-error-actions' },
          waLink('Enviar pelo WhatsApp', 'simulador-erro', 'btn btn--primary btn--sm'),
          h('a', { class: 'btn btn--outline btn--sm', href: mail }, icon('mail', 16), 'Enviar por e-mail'),
        ),
      ),
    );
  }

  function successPanel(message: string) {
    return h(
      'div',
      { class: 'sim-success' },
      h('span', { class: 'sim-success-icon' }, icon('check', 26)),
      h('h4', { tabindex: -1 }, 'Solicitação enviada'),
      h('p', {}, `Recebemos a sua configuração, ${contact.name.split(' ')[0]}. ${message}`),
      h(
        'ol',
        { class: 'sim-next-steps' },
        h('li', {}, 'Um especialista revisa o cenário e confirma as compatibilidades.'),
        h('li', {}, `A equipe entra em contato pelo canal escolhido (${{ whatsapp: 'WhatsApp', phone: 'ligação', email: 'e-mail' }[contact.preference]}).`),
        h('li', {}, 'Você recebe a proposta com as opções para a sua configuração.'),
      ),
      h(
        'div',
        { class: 'sim-success-actions' },
        waLink('Adiantar pelo WhatsApp', 'simulador-sucesso', 'btn btn--outline'),
        h('button', { type: 'button', class: 'btn btn--text', onclick: reset }, icon('rotate-ccw', 16), 'Fazer outra simulação'),
      ),
    );
  }

  function reset() {
    if (submitting) return;
    resetTracking();
    started = false;
    state = emptyState();
    contact = emptyContact();
    touched.clear();
    submitResult = null;
    maxStep = 0;
    persist(null);
    goTo(0);
  }

  // ——— Resumo ———

  function renderSummary() {
    const rows = summarize(state);
    const filled = rows.filter((r) => r.status !== 'pending').length;
    const countText = `${filled} de ${rows.length}`;
    els.summaryCount.textContent = countText;
    els.mobileCount.textContent = countText;

    const list = rows.map((r) => {
      const i = STEPS.findIndex((s) => s.id === r.step);
      const reachable = canVisit(i) && !submitResult?.ok;
      return h(
        'div',
        { class: `sum-row is-${r.status}` },
        h('dt', {}, r.label),
        h(
          'dd',
          {},
          reachable && r.status !== 'pending'
            ? h('button', { type: 'button', class: 'sum-value', onclick: () => { els.sheet.open && els.sheet.close(); goTo(i); }, 'aria-label': `${r.label}: ${r.value}. Alterar` }, r.value)
            : h('span', { class: 'sum-value' }, r.value),
          r.detail ? h('small', {}, r.detail) : null,
        ),
      );
    });
    els.summaryList.replaceChildren(...list);
    els.price.replaceChildren(...priceBlock());

    const actions: Node[] = [
      waLink(filled > 0 ? 'Tirar dúvidas no WhatsApp' : 'Prefere conversar? WhatsApp', 'simulador-resumo', 'btn btn--outline-dark sim-wa'),
    ];
    if (filled > 0 && !submitResult?.ok) {
      actions.push(
        h('button', { type: 'button', class: 'sim-reset', onclick: () => confirm('Recomeçar a simulação? As escolhas atuais serão apagadas.') && reset() }, icon('rotate-ccw', 15), 'Recomeçar'),
      );
    }
    els.summaryActions.replaceChildren(...actions);

    if (els.sheet.open) fillSheet();
  }

  function priceBlock(): HTMLElement[] {
    const p = priceInfo(state, catalog);
    if (p.kind === 'none') {
      return [h('p', { class: 'price-empty' }, 'Na compra, os preços publicados dos equipamentos compatíveis aparecem aqui conforme você avança.')];
    }
    if (p.kind === 'quote') {
      return [h('p', { class: 'price-kicker' }, 'Valor'), h('p', { class: 'price-quote' }, 'Na proposta'), h('p', { class: 'price-note' }, p.reason)];
    }
    const top = p.models.slice(0, 3);
    const more = p.models.length - top.length;
    const modelsList = h(
      'ul',
      { class: 'price-models' },
      ...p.models.map((m, i) =>
        h(
          'li',
          { hidden: i >= 3 ? true : undefined },
          h('a', { href: m.url, target: '_blank', rel: 'noopener' }, h('span', {}, m.name, h('small', {}, `${m.tier}${m.ramGb ? ` · ${m.ramGb} GB` : ''}`)), h('b', {}, brl(m.priceCents))),
        ),
      ),
    );
    const out: HTMLElement[] = [
      h('p', { class: 'price-kicker' }, 'Referência publicada'),
      h('p', { class: 'price-from' }, h('small', {}, 'a partir de'), brl(p.fromCents)),
      h('p', { class: 'price-count' }, `${p.count} ${p.count === 1 ? 'equipamento compatível' : 'equipamentos compatíveis'} no catálogo`),
      modelsList,
    ];
    if (more > 0) {
      const btn = h('button', { type: 'button', class: 'price-more', 'aria-expanded': 'false' }, `Ver mais ${more}`);
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        btn.textContent = open ? 'Mostrar menos' : `Ver mais ${more}`;
        modelsList.querySelectorAll<HTMLElement>('li').forEach((li, i) => (li.hidden = !open && i >= 3));
      });
      out.push(btn);
    }
    out.push(
      h(
        'p',
        { class: 'price-note' },
        `Preço do equipamento${p.ramGb ? ` com ${p.ramGb} GB` : ''} publicado no catálogo em ${catalogDate}. Processadores, discos, garantia estendida e serviços são definidos na proposta, sujeitos a estoque.`,
      ),
    );
    return out;
  }

  // ——— Resumo no celular (bottom sheet) ———

  function fillSheet() {
    // Cópia do resumo lateral; os botões clonados são tratados por delegação abaixo.
    const clone = els.summaryRoot.cloneNode(true) as HTMLElement;
    clone.querySelector('.sim-summary-head')?.remove();
    clone.querySelector('.price-more')?.remove();
    clone.querySelectorAll<HTMLElement>('.price-models li').forEach((li) => (li.hidden = false));
    clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    els.sheetBody.replaceChildren(clone);
  }

  root.querySelector('[data-open-sheet]')?.addEventListener('click', () => {
    fillSheet();
    els.sheet.showModal();
  });
  root.querySelector('[data-close-sheet]')?.addEventListener('click', () => els.sheet.close());
  els.sheet.addEventListener('click', (e) => {
    if (e.target === els.sheet) els.sheet.close();
    const target = e.target as HTMLElement;
    const value = target.closest<HTMLButtonElement>('.sum-value');
    if (value && value.tagName === 'BUTTON') {
      const label = value.closest('.sum-row')?.querySelector('dt')?.textContent;
      const row = summarize(state).find((r) => r.label === label);
      if (row) {
        els.sheet.close();
        goTo(STEPS.findIndex((s) => s.id === row.step));
      }
    }
    if (target.closest('.sim-reset')) {
      els.sheet.close();
      if (confirm('Recomeçar a simulação? As escolhas atuais serão apagadas.')) reset();
    }
  });

  // ——— Atalhos vindos da página (CTAs e cartões) ———

  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-sim-preset], [data-sim-start]');
    if (!el || root.contains(el) || submitting) return;
    const preset = el.dataset.simPreset;
    if (preset) {
      // Um atalho depois de um envio confirmado começa uma nova simulação.
      if (submitResult?.ok) reset();
      markStarted(`atalho-${el.dataset.trackLocation ?? 'pagina'}`);
      const [kind, value] = preset.split(':');
      if (kind === 'workload') {
        const w = value as Workload;
        const workloads = w === 'unsure' ? (['unsure'] as Workload[]) : [...new Set([...state.workloads.filter((x) => x !== 'unsure'), w])];
        update({ workloads }, { render: false });
        goTo(0, { scroll: false });
      } else if (kind === 'modality') {
        update({ modality: value as SimState['modality'] }, { render: false });
        const label = MODALITIES.find((m) => m.value === value)?.title ?? '';
        const objectiveDone = validateStep('objetivo', state) === null;
        pendingNotices.push({ tone: 'info', text: `"${label}" já está selecionado. ${objectiveDone ? 'Confira a modalidade.' : 'Comece pelo uso do servidor.'}` });
        goTo(objectiveDone ? 1 : 0, { scroll: false });
      } else if (kind === 'model') {
        const model = catalog.models.find((m) => m.slug === value);
        if (model) {
          update({ modality: 'buy' }, { render: false });
          update({ formFactor: model.formFactor, processor: model.tier }, { render: false });
          pendingNotices.push({
            tone: 'info',
            text: `Partimos do ${model.name}: compra, formato ${model.formFactor === 'rack' ? 'rack' : 'torre'} e plataforma ${TIERS[model.tier].title}. Complete as etapas restantes.`,
          });
          goTo(firstIncompleteStep(state), { scroll: false });
        }
      }
    } else {
      markStarted(el.dataset.trackLocation ?? 'cta');
    }
    // Deixa a rolagem nativa da âncora acontecer e leva o foco para a etapa,
    // desde que a pessoa não tenha começado a interagir com outra coisa.
    window.setTimeout(() => {
      const active = document.activeElement;
      if (active === el || active === document.body || active === null) {
        els.stage.querySelector<HTMLElement>('.sim-step-title')?.focus({ preventScroll: true });
      }
    }, reducedMotion() ? 0 : 600);
  });

  // ——— Barra fixa no celular: só aparece com o simulador na tela ———

  const io = new IntersectionObserver(([entry]) => root.classList.toggle('is-in-view', entry.isIntersecting), { rootMargin: '-30% 0px -30% 0px' });
  io.observe(root);

  // Primeira renderização
  renderStep();
  renderProgress();
  renderSummary();
  root.classList.add('is-ready');
}
