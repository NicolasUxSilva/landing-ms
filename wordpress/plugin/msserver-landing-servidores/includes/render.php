<?php
/**
 * Entrega da landing na URL da página escolhida.
 */

defined( 'ABSPATH' ) || exit;

/** Marcador de caminho gravado no build (BASE_PATH=/__MSLP__) e trocado aqui pela URL real dos arquivos. */
const MSSLP_PLACEHOLDER = '/__MSLP__/';
/** Origem usada pelo build nas URLs absolutas (og:image). */
const MSSLP_BUILD_ORIGIN = 'https://msserver.com.br';

/**
 * Modo da requisição atual: 'live', 'preview' ou 'off'.
 */
function msslp_request_mode() {
	static $mode = null;
	if ( null !== $mode ) {
		return $mode;
	}
	$mode = 'off';
	$s    = msslp_settings();
	if ( 'off' === $s['mode'] || ! $s['page_id'] || ! is_page( (int) $s['page_id'] ) ) {
		return $mode;
	}
	if ( ! is_readable( MSSLP_DIR . 'app/index.html' ) ) {
		return $mode; // Sem arquivos: a página original continua no ar.
	}
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- parâmetro de visualização, sem efeito colateral.
	$flag      = isset( $_GET['msslp'] ) ? sanitize_key( wp_unslash( $_GET['msslp'] ) ) : '';
	$can_check = current_user_can( 'edit_pages' );

	if ( 'original' === $flag && $can_check ) {
		return $mode; // Administradores podem ver a página antiga para comparação.
	}
	if ( 'live' === $s['mode'] ) {
		$mode = 'live';
	} elseif ( 'preview' === $flag && $can_check ) {
		$mode = 'preview';
	}
	return $mode;
}

add_filter( 'template_include', 'msslp_template_include', PHP_INT_MAX );

function msslp_template_include( $template ) {
	$mode = msslp_request_mode();
	if ( 'off' === $mode ) {
		return $template;
	}

	// A landing já sai otimizada (CSS embutido, JS com hash): otimizadores de
	// página não devem reprocessar, adiar nem combinar os scripts dela.
	if ( ! defined( 'DONOTROCKETOPTIMIZE' ) ) {
		define( 'DONOTROCKETOPTIMIZE', true );
	}
	if ( ! defined( 'DONOTMINIFY' ) ) {
		define( 'DONOTMINIFY', true );
	}
	add_filter( 'autoptimize_filter_noptimize', '__return_true' );

	if ( 'preview' === $mode ) {
		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
			define( 'DONOTCACHEPAGE', true );
		}
		nocache_headers();
		header( 'X-Robots-Tag: noindex, nofollow' );
	}
	header( 'X-MSSERVER-Landing: ' . MSSLP_VERSION . '; ' . $mode );
	return MSSLP_DIR . 'templates/landing.php';
}

/**
 * Monta o documento final: HTML aprovado + URLs reais dos arquivos + rastreamento do site.
 */
function msslp_render_document( $mode ) {
	$html = (string) file_get_contents( MSSLP_DIR . 'app/index.html' );
	$app  = trailingslashit( MSSLP_URL . 'app' );

	$html = str_replace( array( MSSLP_BUILD_ORIGIN . MSSLP_PLACEHOLDER, MSSLP_PLACEHOLDER ), array( $app, $app ), $html );

	if ( 'preview' === $mode ) {
		$html = preg_replace( '#<meta name="robots" content="[^"]*"\s*/?>#', '<meta name="robots" content="noindex, nofollow">', $html, 1 );
	}

	$tracking = msslp_collect_tracking( msslp_settings() );
	$summary  = array();
	foreach ( $tracking['groups'] as $key => $n ) {
		$summary[] = $key . ':' . $n;
	}
	$marker = '<!-- msserver-landing-servidores ' . esc_html( MSSLP_VERSION ) . ' · ' . esc_html( $mode ) . ' · rastreamento ' . esc_html( $summary ? implode( ' ', $summary ) : 'nenhum' ) . ' -->';

	$html = msslp_insert_before( $html, '</head>', $tracking['head'] . "\n" . $marker . "\n" );
	$html = msslp_insert_after_body( $html, $tracking['body_open'] );
	$html = msslp_insert_before( $html, '</body>', $tracking['footer'] . "\n" );
	return $html;
}

function msslp_insert_before( $html, $needle, $content ) {
	if ( '' === trim( $content ) ) {
		return $html;
	}
	$pos = strripos( $html, $needle );
	return false === $pos ? $html : substr_replace( $html, $content, $pos, 0 );
}

function msslp_insert_after_body( $html, $content ) {
	if ( '' === trim( $content ) || ! preg_match( '#<body\b[^>]*>#i', $html, $m, PREG_OFFSET_CAPTURE ) ) {
		return $html;
	}
	$pos = $m[0][1] + strlen( $m[0][0] );
	return substr_replace( $html, "\n" . $content . "\n", $pos, 0 );
}

/**
 * Na prévia, envios feitos por administradores respondem como teste e não
 * chegam ao formulário do Elementor (que roda na prioridade 10).
 */
add_action( 'wp_ajax_elementor_pro_forms_send_form', 'msslp_preview_test_submission', 1 );

function msslp_preview_test_submission() {
	$s = msslp_settings();
	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- o próprio Elementor não usa nonce neste formulário.
	$referrer = isset( $_POST['referrer'] ) ? esc_url_raw( wp_unslash( $_POST['referrer'] ) ) : '';
	if ( empty( $s['test_submissions'] ) || false === strpos( $referrer, 'msslp=preview' ) || ! current_user_can( 'edit_pages' ) ) {
		return;
	}
	wp_send_json_success(
		array(
			'message' => 'Envio de teste da prévia: nada foi enviado à equipe comercial.',
			'data'    => array(),
		)
	);
}
