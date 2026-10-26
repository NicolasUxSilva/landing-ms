// Fatos institucionais e de contato da MSSERVER. Fonte: rodapé e páginas de
// msserver.com.br (consultadas em 26/10/2026). Altere aqui, nunca nos componentes.

export const SITE = {
  name: 'MSSERVER',
  origin: 'https://msserver.com.br',
  canonical: 'https://msserver.com.br/servidores-dedicados-para-empresas/',
  alternatePtPt: 'https://msserver.com.br/servidores-dedicados-para-empresas-pt/',
  title: 'Servidores Dedicados para Empresas | Venda e Locação | MSSERVER',
  description:
    'Servidores dedicados Dell, HPE e IBM para empresas: compra, locação ou data center, com garantia padrão de 1 ano e extensão até 5 anos, suporte especializado e simulador de configuração.',
  locale: 'pt_BR',
} as const;

export const CONTACT = {
  whatsappNumber: '5511985991837',
  whatsappDisplay: '(11) 98599-1837',
  phoneE164: '+551148585358',
  phoneDisplay: '(11) 4858-5358',
  emailCommercial: 'comercial@msserver.com.br',
  emailGeneral: 'contato@msserver.com.br',
  hours: 'Atendimento das 8h às 18h',
  address: {
    street: 'R. Salvador de Sá, 182',
    district: 'Santa Terezinha',
    city: 'Santo André',
    region: 'SP',
    country: 'BR',
  },
} as const;

export const SOCIAL = [
  { name: 'LinkedIn', url: 'https://www.linkedin.com/company/msserver/' },
  { name: 'Instagram', url: 'https://www.instagram.com/msserver/' },
  { name: 'YouTube', url: 'https://www.youtube.com/@msserversolucoesemservidor9811' },
  { name: 'Facebook', url: 'https://www.facebook.com/msserverinformatica/' },
] as const;

export const APP_STORES = {
  ios: 'https://apps.apple.com/br/app/msserver/id6444350263',
  android: 'https://play.google.com/store/apps/details?id=br.com.msserver',
} as const;

export const LINKS = {
  home: 'https://msserver.com.br/',
  about: 'https://msserver.com.br/sobre/',
  servers: 'https://msserver.com.br/servidores',
  privateCloud: 'https://msserver.com.br/nuvem-privada/',
  warranty: 'https://msserver.com.br/extencao-de-garantia',
  backup: 'https://msserver.com.br/backup-em-nuvem/',
  consulting: 'https://msserver.com.br/consultoria-em-implantacao-de-servidores/',
  app: 'https://msserver.com.br/aplicativo-ms-server/',
  cases: 'https://msserver.com.br/cases-de-sucesso/',
  blog: 'https://msserver.com.br/blog/',
  support: 'https://msserver.com.br/obter-suporte/',
  quote: 'https://msserver.com.br/orcamento/',
} as const;

/**
 * Envio da solicitação comercial.
 *
 * - `elementor`: envia para o formulário Elementor Pro já existente na página
 *   /orcamento/ (post 509, formulário 3c9067f), via admin-ajax.php do próprio
 *   WordPress. Só funciona quando a landing é servida no mesmo domínio.
 * - `mock`: endpoint local de teste (npm run dev / testes). Nunca envia nada.
 * - `disabled`: sem envio por formulário; o simulador oferece WhatsApp e e-mail.
 */
export type LeadMode = 'elementor' | 'mock' | 'disabled';

const envMode = import.meta.env.PUBLIC_LEAD_MODE as LeadMode | undefined;

export const LEAD = {
  mode: (envMode ?? (import.meta.env.DEV ? 'mock' : 'elementor')) as LeadMode,
  endpoint:
    (import.meta.env.PUBLIC_LEAD_ENDPOINT as string | undefined) ??
    (envMode === 'mock' || (!envMode && import.meta.env.DEV) ? '/__mock/lead' : '/wp-admin/admin-ajax.php'),
  timeoutMs: 15000,
  elementor: {
    action: 'elementor_pro_forms_send_form',
    postId: '509',
    formId: '3c9067f',
    queriedId: '509',
    refererTitle: 'Orçamento - MSSERVER',
    fields: {
      name: 'name',
      company: 'field_ba71415',
      email: 'field_f66ed12',
      phone: 'field_2e1002c',
      description: 'field_1d74bd8',
      specializedLabor: 'field_9919f95',
    },
  },
} as const;

export const ANALYTICS = {
  // ID do container GTM encontrado no site atual: GTM-KTDRRP3. Só é carregado
  // quando PUBLIC_GTM_ID é definido no build de produção.
  gtmId: (import.meta.env.PUBLIC_GTM_ID as string | undefined) ?? '',
} as const;

export const whatsappUrl = (text: string) => `https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(text)}`;
