=== MSSERVER Landing Servidores Dedicados ===
Requires at least: 6.4
Requires PHP: 7.4
Stable tag: 1.0.0

Serve a landing page aprovada de servidores dedicados na URL de uma página existente.

== Descrição ==

* Mantém a URL da página escolhida (padrão: /servidores-dedicados-para-empresas/).
* Entrega o HTML aprovado sem o tema nem estilos de outros plugins, para não alterar o design.
* Copia o rastreamento já configurado no site (GTM, gtag/Google Ads, Meta Pixel, Clarity).
* O conteúdo original da página (Elementor) não é alterado: desativar o plugin, ou usar o modo "Desativado", devolve a página antiga.
* Ao ser ativado, fica em modo "Prévia": só administradores veem a landing, com ?msslp=preview.

== Instalação ==

1. Plugins → Adicionar novo → Enviar plugin → selecione o .zip gerado por `npm run build:wp`.
2. Ative. Confira em Configurações → Landing Servidores se a página certa está selecionada.
3. Abra o link de prévia e valide. Depois mude o modo para "No ar".

== Reverter ==

Configurações → Landing Servidores → modo "Desativado", ou desative o plugin.
