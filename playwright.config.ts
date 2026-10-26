import { defineConfig, devices } from '@playwright/test';

// Os testes rodam contra o build de produção com o envio em modo "mock":
// nenhum formulário real é enviado à MSSERVER.
const PORT = 4330;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `PUBLIC_LEAD_MODE=mock node node_modules/astro/bin/astro.mjs build && exec node scripts/preview-mock.mjs ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
});
