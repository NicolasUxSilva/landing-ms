# Landing de servidores dedicados no WordPress

Integração da landing aprovada ao WordPress da MSSERVER por meio de um plugin
próprio. O plugin muda o ambiente de execução, não a página: o HTML, o CSS, o
JavaScript e os assets são os mesmos do build aprovado.

## Estratégia e motivo

| Opção | Decisão |
| --- | --- |
| Template no tema | Descartada: o site usa o Hello Elementor **sem tema filho**, e uma atualização do tema apagaria o template. |
| Reconstruir no Elementor | Descartada: exigiria refazer simulador, animações e estados, com risco alto de diferença. |
| Pasta estática no servidor | Descartada: exige acesso ao servidor (não há) e perde o rastreamento configurado no WordPress. |
| iframe | Descartada: problemas de altura, SEO, analytics e celular. |
| **Plugin com template isolado** | **Escolhida.** Instalável pelo painel (Plugins → Enviar), mantém a URL da página existente, não depende do tema, preserva o rastreamento e reverte com um clique. |

## Como a página é carregada

1. O plugin guarda o build aprovado em `app/` (`index.html` + `_astro/` + favicons + imagem OG).
2. Na página escolhida (padrão: `/servidores-dedicados-para-empresas/`, ID 7404 em produção),
   o filtro `template_include` (prioridade máxima) troca o template do tema pelo
   `templates/landing.php` do plugin.
3. Esse template imprime o `index.html` aprovado. Duas coisas são feitas no momento da resposta:
   - o marcador de caminho `/__MSLP__/` do build é trocado pela URL real de
     `wp-content/plugins/msserver-landing-servidores/app/`;
   - o rastreamento do site entra no documento. O plugin executa `wp_head`,
     `wp_body_open` e `wp_footer` em memória e copia **apenas** os `<script>`/`<noscript>`
     de GTM, gtag/Google Ads, Meta Pixel e Clarity, na ordem original.
4. **Nenhum CSS ou JS do tema ou de outros plugins chega à página.** Ficam de fora o
   Elementor, o WooCommerce, o Click to Chat, o Leadster (configurável) e o CSS
   global. O header e o footer são os da landing aprovada.
5. O conteúdo da página no Elementor **não é alterado**. Com o plugin desativado,
   ou no modo "Desativado", a página antiga volta a aparecer.

### Modos (Configurações → Landing Servidores)

| Modo | Visitantes | Administradores |
| --- | --- | --- |
| Desativado | Página original | Página original |
| **Prévia** (padrão na ativação) | Página original | Landing em `?msslp=preview`, com `noindex`, sem cache. Envios respondem como teste. |
| No ar | Landing | Landing; `?msslp=original` mostra a página antiga para comparação |

Na prévia, envios feitos por administradores são respondidos pelo próprio plugin
("Envio de teste da prévia…") e **não chegam** ao formulário do Elementor. A opção
pode ser desligada para um envio real autorizado.

## Instalação e publicação (sem risco para a campanha)

Não há staging nem acesso ao WordPress neste ambiente: **nada foi instalado em produção.**
O modo Prévia funciona como homologação dentro da própria produção.

1. Gere o pacote: `npm run sync:catalog` e depois `npm run build:wp`. O resultado fica
   em `wordpress/dist/msserver-landing-servidores-<versão>.zip`.
2. Faça backup do site (arquivos e banco), como em qualquer instalação de plugin.
3. WordPress → Plugins → Adicionar novo → Enviar plugin → selecione o `.zip` → Ativar.
   O plugin já ativa em **Prévia**: visitantes continuam vendo a página atual.
4. Configurações → Landing Servidores: confira se a página selecionada é
   "Servidores Dedicados para Empresas".
5. Valide pelo link de prévia (logado como administrador):
   - visual em desktop e celular;
   - simulador completo (os envios respondem como teste);
   - comentário no fim do `<head>`: `<!-- msserver-landing-servidores … rastreamento gtm:… gtag:… meta:… clarity:… -->`;
   - GTM Preview / Meta Pixel Helper / Tag Assistant recebendo os eventos;
   - **um envio real autorizado**: desmarque "Envios na prévia", envie e confirme o
     recebimento no e-mail/CRM do formulário de `/orcamento/`, depois marque de novo.
6. Publique: modo **No ar**. Se houver cache de página ou CDN, limpe o cache da URL.
7. Confirme como visitante (janela anônima) e veja o cabeçalho
   `X-MSSERVER-Landing: <versão>; live`.

## Reverter

- **Imediato:** Configurações → Landing Servidores → **Desativado** (ou **Prévia**).
- **Completo:** desativar o plugin. Excluir o plugin também remove as configurações.
- Em todos os casos a página do Elementor reaparece como estava. URL, SEO e
  conteúdo antigos não foram tocados.

## Atualizar a landing no futuro

1. Altere o projeto (`src/`), rode `npm test`, `npm run test:e2e` e `npm run sync:catalog`.
2. Aumente a versão em `package.json` e rode `npm run build:wp`.
3. Plugins → Adicionar novo → Enviar plugin → mesmo `.zip` novo → "Substituir o atual
   pelo enviado". As configurações (modo, página, rastreamento) são mantidas.
4. Para testar antes, use o modo Prévia ou `npm run wp:dev` localmente.

## Decisões que dependem da MSSERVER

- **Leadster:** o widget de chat roda hoje na página. Ele fica **desligado** por padrão
  porque adiciona um balão sobre a página aprovada, que já tem o botão de WhatsApp.
  Se o marketing quiser mantê-lo, basta marcar "Leadster" nas configurações (o
  posicionamento dele não foi validado com o design).
- **Click to Chat:** fica de fora, porque a landing já tem o botão de WhatsApp
  dela. Ligá-lo duplicaria o botão.
- **Google Listings & Ads:** a tag de remarketing (gtag/AW) é repassada. O script de
  eventos de produtos do WooCommerce não é, porque não há carrinho nesta página.
- **Cache e otimização:** não foi detectado cache de página em produção
  (`Cache-Control: no-store`, nginx). Se um plugin de otimização for instalado depois,
  a landing já pede para não ser reprocessada (`DONOTROCKETOPTIMIZE`, `DONOTMINIFY`,
  filtro do Autoptimize).
- **Firewall/segurança:** o envio usa `POST /wp-admin/admin-ajax.php`
  (`action=elementor_pro_forms_send_form`), igual aos formulários atuais do site.

## Testes executados (ambiente local)

O WordPress local usa o WordPress Playground (`npm run wp:dev`): WordPress 7.1.3
(produção: 7.1.2), PHP 8.3, tema Hello Elementor e plugin Elementor. O plugin é
instalado a partir do `.zip`. O mu-plugin `dev/mu-plugins/msslp-test-env.php`
(somente local) imprime trechos de rastreamento com **IDs falsos**, um CSS de tema
"hostil" e um script comum, e simula o endpoint do Elementor Pro com a mesma
validação de telefone. Nenhum lead nem evento real sai da máquina.

| Teste | Resultado |
| --- | --- |
| Build do plugin idêntico ao aprovado (HTML normalizado + bytes dos 68 assets) | Idêntico |
| Fidelidade visual pixel a pixel em 360, 390, 768, 1024, 1440 e 1920 px (`wordpress/test/capture.mjs` + `compare.mjs`) | **0 pixels diferentes**, mesmas alturas de página. Controle negativo: o comparador detecta 400 px alterados. |
| Suíte E2E original (simulador, envio, erros, atalhos, persistência, teclado, celular, SEO, links, axe) rodando no WordPress | Aprovada, desktop e celular |
| Testes específicos do WordPress (`wordpress/test/wp.spec.ts`): isolamento de CSS, repasse do rastreamento, contrato do formulário Elementor, animações e rolagem, prévia, envio de teste na prévia, configurações e reversão | Aprovados, desktop e celular |
| Total `npm run test:wp` | 38 aprovados |
| PHP 7.4 (smoke test) | Saída idêntica à do PHP 8.3 |

**Não testado:** o WordPress de produção (sem acesso), o Elementor Pro real (pago; o
contrato foi simulado a partir do HTML do formulário de `/orcamento/`) e os plugins
de produção que não são públicos.

## Arquivos

```
wordpress/
  plugin/msserver-landing-servidores/   código do plugin (PHP)
    msserver-landing-servidores.php     cabeçalho, constantes, ativação
    includes/settings.php               tela de configurações e opções
    includes/render.php                 template_include, montagem do documento, envio de teste na prévia
    includes/tracking.php               repasse de GTM, gtag, Meta Pixel, Clarity (e Leadster, opcional)
    templates/landing.php               imprime o documento
    uninstall.php, readme.txt
  build.mjs                             build aprovado com BASE_PATH=/__MSLP__ → pacote .zip
  dev/blueprint.json, dev/mu-plugins/   WordPress local de teste (não vai no pacote)
  test/                                 capturas, comparação pixel a pixel e testes E2E do WordPress
  REFERENCIA-APROVADA.sha256            hash dos arquivos da versão aprovada
```

A versão aprovada não foi alterada: `shasum -a 256 -c wordpress/REFERENCIA-APROVADA.sha256`
confere todos os arquivos de `src/`, `public/` e da configuração. Única diferença: os
scripts novos no `package.json` (`build:wp`, `wp:dev`, `test:wp`). Os testes E2E
ganharam a opção de apontar para outra URL (`E2E_PATH`), sem mudar o que verificam.
