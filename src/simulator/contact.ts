import type { ContactData } from './types';

export type ContactField = 'name' | 'company' | 'email' | 'phone';

export const emptyContact = (): ContactData => ({
  name: '',
  company: '',
  email: '',
  phone: '',
  preference: 'whatsapp',
  timeline: '',
  notes: '',
  website: '',
});

const digits = (v: string) => v.replace(/\D/g, '');

export function validateField(field: ContactField, c: ContactData): string | null {
  const v = c[field].trim();
  switch (field) {
    case 'name':
      return v.length >= 2 ? null : 'Informe seu nome.';
    case 'company':
      return v.length >= 2 ? null : 'Informe o nome da empresa.';
    case 'email':
      if (!v) return 'Informe seu e-mail.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : 'Confira o e-mail: parece estar incompleto.';
    case 'phone': {
      const d = digits(v).replace(/^55(?=\d{10,11}$)/, '');
      if (!d) return 'Informe um telefone ou WhatsApp com DDD.';
      return d.length === 10 || d.length === 11 ? null : 'Use o formato (11) 98765-4321, com DDD.';
    }
  }
}

export function validateContact(c: ContactData): Partial<Record<ContactField, string>> {
  const errors: Partial<Record<ContactField, string>> = {};
  for (const f of ['name', 'company', 'email', 'phone'] as ContactField[]) {
    const e = validateField(f, c);
    if (e) errors[f] = e;
  }
  return errors;
}

/** Máscara leve para telefones brasileiros: (11) 98765-4321 / (11) 4858-5358. */
export function formatPhone(value: string): string {
  let d = digits(value);
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2); // remove o código do país (+55)
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
