<?php
/**
 * Repasse do rastreamento já configurado no site.
 *
 * A landing não carrega o tema nem os estilos de outros plugins. Para não
 * perder analytics e conversões, o plugin executa wp_head, wp_body_open e
 * wp_footer em memória e copia apenas os <script>/<noscript> dos grupos
 * marcados, na mesma ordem em que o site os imprime.
 */

defined( 'ABSPATH' ) || exit;

function msslp_tracking_groups() {
	return array(
		'gtm'      => array(
			'label'    => 'Google Tag Manager',
			'patterns' => array( 'googletagmanager.com/gtm.js', 'googletagmanager.com/ns.html' ),
		),
		'gtag'     => array(
			'label'    => 'Google tag (gtag.js) e conversões do Google Ads',
			'patterns' => array( 'googletagmanager.com/gtag/js', 'gtag(', 'gtag_report_conversion' ),
		),
		'meta'     => array(
			'label'    => 'Meta Pixel',
			'patterns' => array( 'fbq(', 'connect.facebook.net', 'facebook.com/tr?' ),
		),
		'clarity'  => array(
			'label'    => 'Microsoft Clarity',
			'patterns' => array( 'clarity.ms' ),
		),
		'leadster' => array(
			'label'    => 'Leadster (widget de chat; desligado por padrão porque adiciona um balão sobre a página aprovada)',
			'patterns' => array( 'leadster.com.br' ),
		),
	);
}

/** Executa uma ação do WordPress e devolve o que ela imprimiu. */
function msslp_capture_output( $callback ) {
	ob_start();
	try {
		call_user_func( $callback );
	} catch ( \Throwable $e ) {
		// Um plugin com erro não pode derrubar a landing.
		unset( $e );
	}
	return (string) ob_get_clean();
}

/**
 * Filtra os trechos de rastreamento. Devolve ['html' => string, 'groups' => [grupo => qtd]].
 */
function msslp_filter_tracking( $html, $enabled ) {
	$groups = msslp_tracking_groups();
	$kept   = array();
	$count  = array();
	if ( preg_match_all( '#<(script|noscript)\b[^>]*>.*?</\1\s*>#is', $html, $matches ) ) {
		foreach ( $matches[0] as $snippet ) {
			foreach ( $enabled as $key ) {
				if ( empty( $groups[ $key ] ) ) {
					continue;
				}
				foreach ( $groups[ $key ]['patterns'] as $pattern ) {
					if ( false !== stripos( $snippet, $pattern ) ) {
						$kept[]        = $snippet;
						$count[ $key ] = ( $count[ $key ] ?? 0 ) + 1;
						continue 3;
					}
				}
			}
		}
	}
	return array(
		'html'   => implode( "\n", $kept ),
		'groups' => $count,
	);
}

/**
 * Coleta o rastreamento do site para a landing.
 * Devolve ['head' => string, 'body_open' => string, 'footer' => string, 'groups' => array].
 */
function msslp_collect_tracking( $settings ) {
	$enabled = (array) $settings['tracking'];
	$parts   = array(
		'head'      => msslp_capture_output( 'wp_head' ),
		'body_open' => msslp_capture_output(
			function () {
				do_action( 'wp_body_open' );
			}
		),
		'footer'    => msslp_capture_output( 'wp_footer' ),
	);

	$out    = array( 'groups' => array() );
	$has_gtm = false;
	foreach ( $parts as $where => $html ) {
		$filtered      = $enabled ? msslp_filter_tracking( $html, $enabled ) : array( 'html' => '', 'groups' => array() );
		$out[ $where ] = $filtered['html'];
		foreach ( $filtered['groups'] as $key => $n ) {
			$out['groups'][ $key ] = ( $out['groups'][ $key ] ?? 0 ) + $n;
		}
		$has_gtm = $has_gtm || false !== stripos( $filtered['html'], 'googletagmanager.com/gtm.js' );
	}

	$gtm = (string) $settings['gtm_fallback'];
	if ( ! $has_gtm && '' !== $gtm ) {
		$out['head']      = msslp_gtm_snippet( $gtm ) . "\n" . $out['head'];
		$out['body_open'] = '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=' . esc_attr( $gtm ) . '" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>' . "\n" . $out['body_open'];
		$out['groups']['gtm_fallback'] = 1;
	}
	if ( '' !== (string) $settings['head_extra'] ) {
		$out['head'] .= "\n" . $settings['head_extra'];
	}
	return $out;
}

function msslp_gtm_snippet( $id ) {
	return "<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','" . esc_js( $id ) . "');</script>";
}
