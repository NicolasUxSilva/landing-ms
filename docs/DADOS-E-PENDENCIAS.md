# Dados, fontes e pendências de validação

Todas as informações comerciais e técnicas da página vêm de páginas publicadas em
msserver.com.br, consultadas em 26/10/2026. Nada foi inventado. Onde as fontes
divergiam ou estavam incompletas, a divergência está registrada abaixo junto com a
decisão tomada.

## Fontes usadas

| Informação na página | Fonte |
| --- | --- |
| Garantia padrão de 1 ano, extensão até 5 anos; selo de garantia, checklist e teste de stress | Páginas de produto WooCommerce (ex.: `/servidor/servidor-dell-r740/`) |
| Plano Non-Stop (substituição antecipada) e cobertura de peças | `/extencao-de-garantia` |
| Venda e locação; servidores usados e seminovos Dell, HP e IBM; suporte on-site | Landing atual, home e `/sobre/` |
| Nuvem privada em data center, 100% personalizável | `/nuvem-privada/` e `/sobre/` |
| IPs, acesso remoto por console, VLAN/VPN/firewall/link ponto a ponto e backup diário como adicionais | `/servidores-dedicados/` (ver alerta 3) |
| Suporte humano ("especialistas, não robôs"), consultoria, recompra, estoque e envio para todo o Brasil | Landing atual e home |
| App gratuito (monitoramento, suporte, backups, extensão de garantia) e links das lojas | Home e `/aplicativo-ms-server/` |
| +15 anos no mercado, +250 projetos entregues | `/cases-de-sucesso/` |
| Seis cases (Lumiar, Datasafer, Rumo, Ourominas, Terracom, Forças Armadas) | `/cases-de-sucesso/` |
| Quatro depoimentos (Fernando, Sara, Jessica, Pedro Hermano) | `/sobre/` (só correções de digitação) |
| Logos de clientes | Seção "Alguns clientes" da landing atual |
| Contatos, endereço e horário | Rodapé do site |
| Preços e variações de memória dos 49 servidores | Store API pública do WooCommerce (`npm run sync:catalog`) |
| Processadores, memórias, discos e IPs do data center | Configurador de `/servidores-dedicados/` |
| Vídeo "5 erros mais comuns ao comprar um servidor" | Landing atual (canal da MSSERVER no YouTube) |

## Divergências e correções

1. **Dois catálogos no configurador `/servidores-dedicados/`.** A versão de desktop
   lista núcleos (4 a 22), memória 8/16/32/48/64 GB, discos de 300 GB a 2 TB e de 1 a
   6 IPs. A versão móvel lista 11 modelos de processador, memória 16/32/64 GB, 10
   opções de disco e de 1 a 6 IPs. O simulador usa a **lista por modelo**, mais
   específica. Capacidades fora dela entram como "Mais de 64 GB" e "Outra
   configuração". *Validar qual lista vale.*
2. **Especificações corrigidas pela documentação da Intel:**
   - Xeon Gold 6138: publicado como "44 núcleos / 88 threads"; o correto é 40 / 80 com
     dois processadores.
   - Xeon E5-2680 v3: publicado com 2,0 GHz; a frequência base é 2,5 GHz.
   - "1x E3-1200" não informa a geração (v1 a v6), e o limite de memória depende
     dela. Por isso a combinação com 64 GB gera alerta.
3. **Textos de `/servidores-dedicados/` são quase idênticos aos da EVEO**
   (Conectividade Akamai/Cloudflare/IX.br, Console/KVM, "parceira oficial Intel Xeon",
   "suporte técnico 24 horas, data center no Brasil"). A nova página **não** repete
   as alegações de peering, parceria Intel ou suporte 24h para o dedicado. Usa só
   IPs dedicados, acesso remoto por console e os serviços adicionais. *A MSSERVER
   precisa confirmar se opera ou revende o servidor em data center e quais recursos
   estão de fato incluídos.*
4. **Catálogo WooCommerce:**
   - Listagem duplicada do **Dell R640** (produto 7502, só 32 GB, R$ 22.500, foto do
     R440) contra o produto 5632 (32 GB a R$ 21.250). O 7502 está **fora** do
     simulador até a MSSERVER confirmar o preço válido.
   - Descrições com erro: "768TB"/"192TB"/"384TB" de memória (R720, R620, R420,
     R430; o certo é GB); R230 descrito com "2 processadores E5-2400" (é um
     processador Xeon E3-1200 v5/v6); T330 com "E5 1200 v6" e DDR3 (é E3-1200 v6,
     DDR4); ML110 G9 com DDR3 (é DDR4); ML310 G8 na categoria IBM.
   - Slugs trocados: `servidor-dell-t420` é o **T320**; `servidor-dell-r320` é o **R230**.
   - Fotos reaproveitadas de outros modelos (R540 e R740XD com foto do R740; R730
     com foto do R730XD; R230 com foto do R420; DL380 G7 e DL360 G7 com fotos de G6).
     Por isso a vitrine da página usa só seis modelos com foto própria.
   - Preço fora de ordem: R530 com 16 GB (R$ 19.000) mais caro que com 32 GB
     (R$ 15.800). Variações com preço R$ 0 (DL360 G10 8 GB; DL380 G10 8 e 16 GB)
     aparecem como "sob consulta".
   - A classificação por plataforma (`src/data/platform-map.json`) foi feita à mão a
     partir das descrições, corrigida pela documentação dos fabricantes.
5. **Indicadores não usados**, porque soam como garantia contratual ou não puderam ser
   verificados: "99,9% Uptime Garantido", "+40% Redução de Custos", "ISO 27001",
   "AWS Partner" (`/cases-de-sucesso/`), selo "Tier III Design Equinix SP3, expires 22
   March 2021" (rodapé, vencido) e a lista de parceiros (Red Hat, Microsoft, Intel...).
6. **Horário:** o site diz "8 am as 18 pm", sem dias da semana. A página usa
   "Atendimento das 8h às 18h".

## Pendências que dependem da MSSERVER

- [ ] Confirmar o catálogo do data center (item 1) e a natureza da oferta (item 3).
- [ ] Confirmar o preço do R640 e corrigir as descrições, slugs e fotos do WooCommerce
      (item 4). Depois, rodar `npm run sync:catalog`.
- [ ] Confirmar as condições da **locação** (prazos, o que inclui). A página não
      promete nada além de "condições definidas na proposta" e oculta a extensão de
      garantia nessa modalidade.
- [ ] Confirmar a autorização para exibir os logos de clientes (já exibidos na landing atual).
- [ ] Publicar uma **política de privacidade** (`/politica-de-privacidade/` retorna
      404) e linkar no aviso do formulário e no rodapé.
- [ ] Validar "+15 anos" e "+250 projetos" (publicados só na página de cases).
- [ ] Opcional: fornecer fotos próprias dos equipamentos em estoque para substituir as
      fotos de catálogo.
