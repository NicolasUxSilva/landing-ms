# Integrações e publicação

## Envio da solicitação (lead)

O simulador oferece dois caminhos reais, ambos acionados pelo usuário:

1. **Formulário → Elementor Pro (padrão em produção).** O envio vai para
   `/wp-admin/admin-ajax.php` com `action=elementor_pro_forms_send_form`, usando o
   formulário que **já existe** na página `/orcamento/` (post 509, formulário
   `3c9067f`). As ações configuradas nesse formulário (e-mail, webhooks, CRM) passam a
   receber os leads do simulador.

   | Campo Elementor | Conteúdo enviado |
   | --- | --- |
   | `name` | Nome |
   | `field_ba71415` | Empresa |
   | `field_f66ed12` | E-mail |
   | `field_2e1002c` | Telefone/WhatsApp sem espaços, ex.: `(11)98765-4321` (o campo Tel do Elementor recusa espaços) |
   | `field_1d74bd8` | Configuração completa em uma linha: uso, modalidade, processador, memória, armazenamento, IPs, serviços, quantidade, referência de preço, preferência de contato, prazo, observações e origem (utm/gclid) |
   | `field_9919f95` | "Sim" se o usuário marcou consultoria/implantação; senão "A definir" |

   A tela de sucesso só aparece quando o WordPress responde `success: true`. Erro,
   tempo esgotado (15 s) ou resposta inesperada mostram a mensagem do servidor,
   mantêm os dados preenchidos e oferecem WhatsApp e e-mail com a configuração.

2. **WhatsApp.** Os links usam `wa.me/5511985991837` com a configuração já escrita,
   **sem** nome, empresa, telefone ou observações: URLs de saída podem ser registradas
   pelo GA4/GTM, e o WhatsApp já identifica quem enviou. Abrir o WhatsApp **não** conta
   como envio: a página avisa que é preciso mandar a mensagem por lá. No fallback por
   e-mail (`mailto:`), as observações vão junto.

Configuração em `src/config/site.ts` e por variáveis de ambiente (ver `.env.example`):

| Variável | Valores | Padrão |
| --- | --- | --- |
| `PUBLIC_LEAD_MODE` | `elementor`, `mock`, `disabled` | `mock` no `npm run dev`; `elementor` no build |
| `PUBLIC_LEAD_ENDPOINT` | URL do admin-ajax | `/wp-admin/admin-ajax.php` |
| `PUBLIC_GTM_ID` | ID do container | vazio (não carrega GTM) |
| `PUBLIC_NOINDEX` | `true` em homologação | `false` |
| `BASE_PATH` | caminho de publicação | `/` |

### Pendências do envio

- [ ] **Teste real autorizado.** O endpoint do Elementor não foi chamado durante o
      desenvolvimento (só o mock local). Antes de publicar, faça um envio de teste em
      homologação no mesmo domínio e confirme o recebimento no e-mail/CRM configurado.
- [ ] O campo `field_1d74bd8` é do tipo **texto**: o WordPress remove quebras de linha
      e por isso a configuração vai em uma linha separada por "|". Recomendado: trocar
      o campo para **área de texto** ou criar um formulário dedicado ao simulador e
      atualizar `LEAD.elementor` em `src/config/site.ts`.
- [ ] Mesma origem: o admin-ajax só responde corretamente se a landing for servida em
      `msserver.com.br`. Plugins de cache/segurança (WAF, Cloudflare) não podem
      bloquear POST em `admin-ajax.php` vindo dessa página.
- [ ] Se o formulário de `/orcamento/` for excluído ou recriado, atualize `postId`,
      `formId` e os nomes dos campos.

## Analytics

O site atual carrega GTM `GTM-KTDRRP3`, Google Ads `AW-715484072`, Meta Pixel e
Microsoft Clarity. A página envia ao `dataLayer` (sem nome, e-mail, telefone ou
empresa):

| Evento | Quando | Parâmetros |
| --- | --- | --- |
| `cta_click` | Clique em CTA de simulação | `location` |
| `simulation_start` | Primeira interação com o simulador | `entry` |
| `simulation_step_complete` | Ao avançar uma etapa válida (uma vez por etapa e caminho, por simulação) | `step_id`, `step_number`, `sim_path` |
| `simulation_complete` | Chegada à etapa de envio com tudo preenchido (uma vez) | `sim_path` |
| `quote_request_start` | Primeiro foco em um campo de contato (uma vez) | — |
| `quote_request_submit` | **Somente** após `success: true` do servidor | `sim_path`, `lead_channel` |
| `quote_request_error` | Falha no envio | `reason` |
| `contact_whatsapp_click` | Clique em qualquer link de WhatsApp | `location` |
| `video_play` | Vídeo carregado | `video` |

- [ ] **No GTM:** criar gatilhos de evento personalizado para esses nomes, usar
      `quote_request_submit` como conversão (GA4, Google Ads e Meta) e
      `contact_whatsapp_click` como microconversão. Não foi possível acessar o container.
- [ ] Verificar se Meta Pixel e Clarity são carregados pelo GTM. Se forem inseridos
      direto pelo tema do WordPress, precisam ir para o GTM antes de publicar a página
      fora do tema.

## Publicação

A publicação é feita pelo plugin WordPress descrito em
[../wordpress/README.md](../wordpress/README.md). Ele mantém a URL
`/servidores-dedicados-para-empresas/`, isola a página do tema, repassa o
rastreamento já configurado no site (GTM, gtag/Google Ads, Meta Pixel, Clarity) e
ativa em modo Prévia, sem afetar a campanha. Nada foi publicado.

Com o plugin, a variável `PUBLIC_GTM_ID` não é usada: o GTM vem do próprio WordPress.
