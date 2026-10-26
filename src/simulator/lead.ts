import type { LeadMode } from '../config/site';

export interface LeadConfig {
  mode: LeadMode;
  endpoint: string;
  timeoutMs: number;
  elementor: {
    action: string;
    postId: string;
    formId: string;
    queriedId: string;
    refererTitle: string;
    fields: Record<'name' | 'company' | 'email' | 'phone' | 'description' | 'specializedLabor', string>;
  };
}

export interface LeadPayload {
  name: string;
  company: string;
  email: string;
  phone: string;
  description: string;
  specializedLabor: string;
  pageUrl: string;
}

export type LeadFailure = 'disabled' | 'network' | 'timeout' | 'rejected' | 'invalid-response';

export type LeadResult = { ok: true; message: string } | { ok: false; reason: LeadFailure; message: string };

export const elementorPhone = (phone: string) => phone.replace(/[^0-9()#&+*\-=.]/g, '');

/**
 * Envia a solicitação para o formulário Elementor Pro (ou para o mock local,
 * que responde no mesmo formato). Só devolve `ok: true` quando o servidor
 * confirma o recebimento com `success: true`.
 */
export async function submitLead(payload: LeadPayload, cfg: LeadConfig, fetchImpl: typeof fetch = fetch): Promise<LeadResult> {
  if (cfg.mode === 'disabled') {
    return { ok: false, reason: 'disabled', message: 'O envio por formulário não está disponível nesta página.' };
  }

  const e = cfg.elementor;
  const body = new FormData();
  body.append('action', e.action);
  body.append('post_id', e.postId);
  body.append('form_id', e.formId);
  body.append('queried_id', e.queriedId);
  body.append('referer_title', e.refererTitle);
  body.append('referrer', payload.pageUrl);
  body.append(`form_fields[${e.fields.name}]`, payload.name);
  body.append(`form_fields[${e.fields.company}]`, payload.company);
  body.append(`form_fields[${e.fields.email}]`, payload.email);
  // O campo Tel do Elementor só aceita números e (#, -, *, +, parênteses...): sem espaços.
  body.append(`form_fields[${e.fields.phone}]`, elementorPhone(payload.phone));
  body.append(`form_fields[${e.fields.description}]`, payload.description);
  body.append(`form_fields[${e.fields.specializedLabor}]`, payload.specializedLabor);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  let res: Response;
  try {
    res = await fetchImpl(cfg.endpoint, { method: 'POST', body, credentials: 'same-origin', signal: controller.signal });
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    return {
      ok: false,
      reason: aborted ? 'timeout' : 'network',
      message: aborted ? 'O servidor demorou para responder.' : 'Não foi possível conectar ao servidor.',
    };
  } finally {
    clearTimeout(timer);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, reason: 'invalid-response', message: `Resposta inesperada do servidor (HTTP ${res.status}).` };
  }

  const data = json as { success?: boolean; data?: { message?: string; errors?: Record<string, string> } };
  if (res.ok && data?.success === true) {
    return { ok: true, message: data.data?.message ?? 'Solicitação recebida.' };
  }
  const fieldErrors = data?.data?.errors ? Object.values(data.data.errors).filter(Boolean) : [];
  return {
    ok: false,
    reason: 'rejected',
    message: [data?.data?.message, ...fieldErrors].filter(Boolean).join(' ') || `O servidor recusou o envio (HTTP ${res.status}).`,
  };
}
