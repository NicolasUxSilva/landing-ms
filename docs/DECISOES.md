# Pesquisa e decisões de design

Registro curto do que foi observado nas referências (em 26/10/2026, nos
navegadores) e de como isso virou decisão concreta nesta página.

## Ponto de partida

- O repositório estava vazio. A página atual roda em WordPress 7.1 + Elementor Pro
  + WooCommerce, sem código acessível localmente. Por isso a nova landing é um
  projeto estático independente, publicável no mesmo domínio (ver
  `INTEGRACOES-E-PUBLICACAO.md`), sem migrar o site.
- Página atual: hero genérico, grade de 18 produtos com faixa de preço, seis
  diferenciais, logos de clientes, vídeo e um formulário que pede até o
  "investimento disponível". Não havia simulador nem explicação das modalidades.

## O que cada referência ensinou

**EVEO, página e simulador.** É a referência funcional principal. O fluxo vai do CTA
"Faça uma simulação" para uma página separada com configurador em duas abas (hardware
e adicionais), resumo escuro fixo à direita e modal de orçamento com nome, sobrenome,
telefone, empresa, e-mail corporativo e preferência de contato. Não mostra preço.
- Aproveitado: resumo vivo ao lado, revisão antes do envio, preferência de contato,
  honeypot contra spam e o princípio de liberar o hardware em etapas.
- Superado: o simulador fica **dentro** da landing e recebe atalhos das seções
  (uso, modalidade, modelo). Começa pela necessidade do cliente, não pelo hardware.
  Toda etapa aceita "não sei". No celular, o resumo vira barra fixa + folha inferior
  (na EVEO ele fica no fim da página). Para compra, mostra preços publicados de
  equipamentos compatíveis.

**NVIDIA.** Ritmo editorial: rótulo de seção, título forte à esquerda, texto de apoio
e conteúdo em grade. Daí vieram os rótulos numerados em fonte mono ("01 Aplicações")
e a alternância de seções claras e escuras. A estética gamer e o verde ficaram de fora.

**Finera.** Interfaces de produto como imagem principal, em vez de fotos de banco. Daí
vem o "console" do hero, um exemplo real do resumo do simulador sobre uma ilustração
técnica original, e o bento de diferenciais com uma visualização de dados (linha do
tempo da garantia).

**Jimo.** Acabamento, tipografia leve e contenção visual. O excesso de animação
controlada por rolagem (longos trechos vazios enquanto o conteúdo anima) foi
evitado de propósito: aqui as entradas são discretas e desligadas com
`prefers-reduced-motion`.

## Arquitetura da página

| # | Seção | Pergunta que responde |
| --- | --- | --- |
| — | Hero + console de exemplo | O que é oferecido e qual o próximo passo |
| — | Logos de clientes | Quem já confiou |
| 01 | Aplicações | Para quais necessidades faz sentido (com atalho para o simulador) |
| 02 | Modalidades | Compra, locação ou data center: o que muda |
| 03 | Diferenciais | Por que a MSSERVER (garantia, testes, suporte, app, consultoria, recompra) |
| 04 | Simulador | Como chegar a uma configuração inicial |
| 05 | Equipamentos | Modelos com preço publicado, como ponto de partida |
| 06 | Processo | Como funciona a contratação |
| 07 | Quem atende | Equipe real, depoimentos e cases publicados |
| 08 | Dúvidas | Objeções de compra |
| — | CTA final + rodapé | Contato direto |

## Sistema visual

- **Cores** derivadas do logotipo, amostradas do arquivo oficial: índigo do cubo
  (`#312E63`), grafite do texto (`#383135`) e laranja do losango (`#F98305`). O azul
  `#4EB3F4` da landing atual aparece só como acento de dados no fundo escuro. O
  laranja é a cor de ação. Botões laranja usam texto escuro, que dá contraste AA
  (texto branco sobre esse laranja não passaria).
- **Logotipo** usado sem alteração. Como o grafite do logo não funciona em fundo
  escuro, header e rodapé são claros.
- **Tipografia:** Sora (títulos; geometria próxima da palavra "server" do logo), Inter
  (texto e interface) e JetBrains Mono (rótulos e dados técnicos), auto-hospedadas,
  só subconjunto latino, com escala fluida.
- **Imagens:** fotografia real da equipe (página Quem Somos) e fotos de produto do
  catálogo, usadas apenas quando a foto corresponde ao modelo. O hardware do hero é
  uma ilustração original, que não representa nenhum fabricante.
- **Movimento:** entrada discreta dos blocos, transição entre etapas e LEDs da
  ilustração. Tudo é desligado com `prefers-reduced-motion`.

## Simulador: por que esta ordem de etapas

1. **Objetivo** primeiro: orienta as dicas das etapas seguintes e qualifica o lead.
2. **Modalidade** em segundo (o briefing sugeria sexto): compra/locação de servidor
   físico e servidor em data center têm **catálogos diferentes** no site da
   MSSERVER, então a escolha precisa vir antes do hardware.
3. **Processador, memória e armazenamento** mudam conforme o caminho:
   - físico: plataforma (geração) → memória com contagem de modelos com preço →
     tipo de disco e faixa de capacidade (discos não são especificados no catálogo);
   - data center: 11 processadores do configurador publicado → 16/32/64 GB →
     10 opções de disco.
4. **Serviços:** adicionais por modalidade (a extensão de garantia não aparece na
   locação), quantidade de servidores e, no data center, número de IPs.
5. **Envio:** revisão com "Alterar" em cada linha, contato, preferência, prazo
   opcional, observações e envio por formulário ou WhatsApp.

Mudar de caminho reinicia só o que é incompatível e avisa o usuário. Combinações
duvidosas (E3-1200 com 64 GB; NVMe com Xeon E5 v2/E3) geram alerta com
alternativa, mas não bloqueiam: o especialista confirma.
