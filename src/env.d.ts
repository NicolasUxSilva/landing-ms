interface ImportMetaEnv {
  readonly PUBLIC_LEAD_MODE?: 'elementor' | 'mock' | 'disabled';
  readonly PUBLIC_LEAD_ENDPOINT?: string;
  readonly PUBLIC_GTM_ID?: string;
  readonly PUBLIC_NOINDEX?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
