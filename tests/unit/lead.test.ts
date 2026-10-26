import { describe, expect, it, vi } from 'vitest';
import { formatPhone, validateContact, emptyContact } from '../../src/simulator/contact';
import { elementorPhone, submitLead, type LeadConfig, type LeadPayload } from '../../src/simulator/lead';

const cfg: LeadConfig = {
  mode: 'elementor',
  endpoint: '/wp-admin/admin-ajax.php',
  timeoutMs: 50,
  elementor: {
    action: 'elementor_pro_forms_send_form',
    postId: '509',
    formId: '3c9067f',
    queriedId: '509',
    refererTitle: 'Orçamento - MSSERVER',
    fields: { name: 'name', company: 'field_ba71415', email: 'field_f66ed12', phone: 'field_2e1002c', description: 'field_1d74bd8', specializedLabor: 'field_9919f95' },
  },
};

const payload: LeadPayload = {
  name: 'Ana',
  company: 'Exemplo',
  email: 'ana@exemplo.com.br',
  phone: '(11) 98765-4321',
  description: '[Simulador] Uso: ERP',
  specializedLabor: 'A definir',
  pageUrl: 'https://msserver.com.br/servidores-dedicados-para-empresas/',
};

const respond = (status: number, body: unknown) =>
  vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('envio do lead', () => {
  it('monta o corpo no formato do Elementor Pro', async () => {
    const fetchMock = respond(200, { success: true, data: { message: 'Enviado' } });
    await submitLead(payload, cfg, fetchMock as unknown as typeof fetch);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = init.body as FormData;
    expect(url).toBe('/wp-admin/admin-ajax.php');
    expect(body.get('action')).toBe('elementor_pro_forms_send_form');
    expect(body.get('form_id')).toBe('3c9067f');
    expect(body.get('form_fields[field_f66ed12]')).toBe('ana@exemplo.com.br');
    expect(body.get('form_fields[field_1d74bd8]')).toBe('[Simulador] Uso: ERP');
    // O campo Tel do Elementor recusa espaços.
    expect(body.get('form_fields[field_2e1002c]')).toBe('(11)98765-4321');
    expect(elementorPhone('+55 (11) 4858-5358')).toBe('+55(11)4858-5358');
  });

  it('só confirma quando o servidor responde success: true', async () => {
    expect(await submitLead(payload, cfg, respond(200, { success: true, data: { message: 'Enviado' } }) as never)).toEqual({ ok: true, message: 'Enviado' });
    const rejected = await submitLead(payload, cfg, respond(200, { success: false, data: { message: 'Erro', errors: { name: 'Campo obrigatório' } } }) as never);
    expect(rejected).toEqual({ ok: false, reason: 'rejected', message: 'Erro Campo obrigatório' });
  });

  it('trata HTML ou corpo inválido como falha', async () => {
    const r = await submitLead(payload, cfg, respond(404, '<html>Not found</html>') as never);
    expect(r).toMatchObject({ ok: false, reason: 'invalid-response' });
  });

  it('trata falha de rede e tempo esgotado', async () => {
    const network = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await submitLead(payload, cfg, network as never)).toMatchObject({ ok: false, reason: 'network' });

    const slow = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    expect(await submitLead(payload, cfg, slow as never)).toMatchObject({ ok: false, reason: 'timeout' });
  });

  it('não envia nada no modo desativado', async () => {
    const fetchMock = respond(200, { success: true });
    expect(await submitLead(payload, { ...cfg, mode: 'disabled' }, fetchMock as never)).toMatchObject({ ok: false, reason: 'disabled' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('dados de contato', () => {
  it('valida campos obrigatórios', () => {
    const errors = validateContact({ ...emptyContact(), email: 'ana@', phone: '1199' });
    expect(Object.keys(errors).sort()).toEqual(['company', 'email', 'name', 'phone']);
    expect(validateContact({ ...emptyContact(), name: 'Ana', company: 'Ex', email: 'ana@ex.com.br', phone: '+55 11 98765-4321' })).toEqual({});
  });

  it('formata telefones brasileiros', () => {
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
    expect(formatPhone('1148585358')).toBe('(11) 4858-5358');
    expect(formatPhone('119')).toBe('(11) 9');
    expect(formatPhone('+55 11 98765-4321')).toBe('(11) 98765-4321');
    expect(formatPhone('55991234567')).toBe('(55) 99123-4567'); // DDD 55 (RS) preservado
  });
});
