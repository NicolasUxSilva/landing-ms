# Servidores dedicados para empresas · MSSERVER

Landing page de servidores dedicados da MSSERVER com simulador de configuração
integrado. Substitui a página `https://msserver.com.br/servidores-dedicados-para-empresas/`.

- **Stack:** Astro 7 (saída estática), TypeScript sem framework de UI, CSS próprio.
- **Saída:** `dist/` com um `index.html`, CSS embutido e ~20 KB de JavaScript (gzip).
- **Dados reais:** catálogo e preços publicados no WooCommerce de msserver.com.br,
  catálogo do configurador `/servidores-dedicados/` e conteúdo institucional do site.

Documentação complementar:

| Arquivo | Conteúdo |
| --- | --- |
| [docs/DECISOES.md](docs/DECISOES.md) | Pesquisa das referências, arquitetura da página e decisões de design |
| [docs/DADOS-E-PENDENCIAS.md](docs/DADOS-E-PENDENCIAS.md) | Fontes de cada informação, divergências encontradas e o que a MSSERVER precisa validar |
| [docs/INTEGRACOES-E-PUBLICACAO.md](docs/INTEGRACOES-E-PUBLICACAO.md) | Envio do lead, eventos de analytics e variáveis de ambiente |
| [wordpress/README.md](wordpress/README.md) | **Publicação no WordPress** (plugin), testes de fidelidade, atualização e reversão |

## Comandos

```bash
npm install
```

```bash
npm run dev            # http://localhost:4321 · envio em modo de teste (mock)
```

```bash
npm run build          # astro check + build de produção em dist/
```

```bash
npm test               # testes unitários (Vitest)
```

```bash
npm run test:e2e       # testes E2E (Playwright, desktop + celular, com axe)
```

```bash
npm run sync:catalog   # atualiza src/data/catalog.json com os preços publicados
```

```bash
npm run assets         # baixa e otimiza logo, fotos, produtos e logos de clientes
```

```bash
npm run build:wp       # gera o plugin WordPress (.zip) com o build aprovado
```

```bash
npm run wp:dev         # WordPress local (Playground) com o plugin instalado do .zip
```

```bash
npm run test:wp        # suíte E2E + testes de integração contra o WordPress local
```

Os testes E2E fazem o build com `PUBLIC_LEAD_MODE=mock` e servem `dist/` com
`scripts/preview-mock.mjs`; nenhum formulário real é enviado. Na primeira vez,
instale o navegador: `npx playwright install chromium`.

Scripts de QA visual (precisam do `npm run dev` rodando):

- `node scripts/qa-screenshots.mjs [url] [larguras]`: capturas por seção em
  `reports/screenshots/`, com verificação de rolagem horizontal e erros de console.
- `node scripts/qa-simulator.mjs [url] [largura]`: capturas de cada etapa do simulador.
- `node scripts/make-og.mjs`: gera `public/og-servidores-dedicados.jpg`.

## Estrutura

```
src/
  config/site.ts          contatos, links, envio do lead e GTM (fonte única)
  data/
    catalog.json          gerado por sync:catalog (não editar à mão)
    platform-map.json     classificação curada dos modelos por plataforma
    datacenter.ts         catálogo do servidor em data center
    content.ts            textos, FAQ, depoimentos, cases (com a fonte de cada um)
  simulator/              lógica do simulador (pura, testada) + controlador de DOM (ui.ts)
  components/             seções da página (Astro)
  layouts/Base.astro      SEO, fontes, JSON-LD e GTM opcional
  styles/                 tokens, base e estilos do simulador
scripts/                  sincronização de catálogo, ativos, QA e servidor de teste
tests/unit, tests/e2e     Vitest e Playwright
```

## Manutenção do conteúdo

- **Preços:** rode `npm run sync:catalog` antes de cada publicação. O script avisa
  quando aparece um modelo novo sem classificação em `src/data/platform-map.json`.
- **Catálogo do data center:** edite `src/data/datacenter.ts`.
- **Textos, FAQ, depoimentos e cases:** `src/data/content.ts`.
- **Contatos e integrações:** `src/config/site.ts`.
