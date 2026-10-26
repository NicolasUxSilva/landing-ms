import { defineConfig, devices } from '@playwright/test';

// Roda a suíte E2E original e os testes específicos de WordPress contra o
// WordPress local (npm run wp:dev). Os testes mudam o modo do plugin, por isso
// rodam em sequência (1 worker).
const WP = process.env.WP_URL ?? 'http://127.0.0.1:9400';
process.env.E2E_PATH ??= '/servidores-dedicados-para-empresas/';
process.env.E2E_SUCCESS_TEXT ??= 'Recebido pelo Elementor simulado';

export default defineConfig({
  testDir: '../..',
  testMatch: ['tests/e2e/**/*.spec.ts', 'wordpress/test/**/*.spec.ts'],
  workers: 1,
  reporter: [['list']],
  globalSetup: './wp.global-setup.ts',
  use: { baseURL: WP, trace: 'retain-on-failure' },
  projects: [
    { name: 'wp-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'wp-mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
});
