<?php
/**
 * Template da landing: imprime o documento aprovado, sem get_header()/get_footer() do tema.
 */

defined( 'ABSPATH' ) || exit;

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- HTML estático do próprio plugin (build da landing).
echo msslp_render_document( msslp_request_mode() );
