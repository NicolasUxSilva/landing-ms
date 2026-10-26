// @ts-check
import { defineConfig } from 'astro/config';

/**
 * Endpoint local que imita a resposta do Elementor Pro (admin-ajax.php), usado
 * em `npm run dev` e nos testes. Nunca encaminha dados para fora da máquina.
 * Um nome contendo "falha" simula uma recusa do servidor, para testar o fluxo de erro.
 * @returns {import('vite').Plugin}
 */
function mockLeadEndpoint() {
  /** @param {import('vite').Connect.Server} server */
  const attach = (server) =>
    server.use('/__mock/lead', (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        return res.end();
      }
      let raw = '';
      req.on('data', (chunk) => (raw += chunk));
      req.on('end', () => {
        const fail = /name\]"\r?\n\r?\n[^\r\n]*falha/i.test(raw);
        setTimeout(() => {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify(
              fail
                ? { success: false, data: { message: 'Simulação de erro do servidor (ambiente de teste).', errors: [], data: [] } }
                : { success: true, data: { message: 'Recebido pelo endpoint de teste. Nenhum dado foi enviado à MSSERVER.', data: [] } },
            ),
          );
        }, 700);
      });
    });
  return {
    name: 'msserver-mock-lead',
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
  };
}

export default defineConfig({
  site: 'https://msserver.com.br',
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  // CSS inline: uma requisição bloqueante a menos na primeira dobra.
  build: { inlineStylesheets: 'always' },
  vite: { plugins: [mockLeadEndpoint()] },
});
