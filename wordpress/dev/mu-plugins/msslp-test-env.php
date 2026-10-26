<?php
/**
 * Ambiente local de teste (NÃO faz parte do plugin entregue).
 *
 * - Imprime trechos de rastreamento no mesmo formato do site, com IDs FALSOS.
 * - Imprime um CSS "hostil" de tema e um script que não é de rastreamento,
 *   para provar que a landing fica isolada.
 * - Simula o endpoint do Elementor Pro (admin-ajax) com a mesma validação de
 *   telefone; nenhum lead sai da máquina.
 */

add_action( 'wp_enqueue_scripts', function () {
	wp_register_style( 'tema-hostil', false );
	wp_enqueue_style( 'tema-hostil' );
	wp_add_inline_style( 'tema-hostil', 'body{font-family:"Times New Roman",serif!important;background:#ff0000!important}h1,h2,h3{color:#00a000!important}*{box-sizing:content-box!important}.btn{border-radius:0!important}' );
} );

add_action( 'wp_head', function () {
	?>
<!-- Meta Pixel Code (teste) -->
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '000000000000000');fbq('track', 'PageView');</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=000000000000000&ev=PageView&noscript=1"/></noscript>
<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "teste00000");</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-000000000"></script>
<script>window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'AW-000000000');</script>
<script>function gtag_report_conversion(url) { return false; }</script>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-TESTE00');</script>
<script id="script-de-plugin">window.__scriptQueNaoEhRastreamento = true;</script>
	<?php
}, 20 );

add_action( 'wp_body_open', function () {
	echo '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TESTE00" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>';
} );

add_action( 'wp_footer', function () {
	echo '<script>gtag("event", "page_view", {send_to: "GLA"});</script>';
	echo '<script>/* https://cdn.leadster.com.br/neurolead/neurolead.min.js */ window.__leadsterCarregado = true;</script>';
	echo '<script>var ht_ctc_chat_var = {"number":"0"}; window.__clickToChat = true;</script>';
}, 20 );

// Endpoint simulado do Elementor Pro (mesmo contrato do admin-ajax).
function msslp_test_elementor_form() {
	$fields = isset( $_POST['form_fields'] ) ? wp_unslash( (array) $_POST['form_fields'] ) : array();
	$errors = array();
	foreach ( array( 'name', 'field_ba71415', 'field_f66ed12', 'field_2e1002c', 'field_1d74bd8', 'field_9919f95' ) as $key ) {
		if ( empty( $fields[ $key ] ) ) {
			$errors[ $key ] = 'Campo obrigatório.';
		}
	}
	// Mesma regra do campo Tel do Elementor Pro.
	if ( ! empty( $fields['field_2e1002c'] ) && 1 !== preg_match( '/^[0-9()#&+*-=.]+$/', $fields['field_2e1002c'] ) ) {
		$errors['field_2e1002c'] = 'The field accepts only numbers and phone characters (#, -, *, etc).';
	}
	if ( ( $_POST['form_id'] ?? '' ) !== '3c9067f' || ( $_POST['post_id'] ?? '' ) !== '509' ) {
		$errors['form'] = 'Formulário desconhecido.';
	}
	if ( $errors || false !== stripos( (string) ( $fields['name'] ?? '' ), 'falha' ) ) {
		wp_send_json_error( array( 'message' => 'Erro simulado do Elementor (ambiente local).', 'errors' => $errors, 'data' => array() ) );
	}
	$log   = get_option( 'msslp_test_submissions', array() );
	$log[] = $fields;
	update_option( 'msslp_test_submissions', $log, false );
	wp_send_json_success( array( 'message' => 'Recebido pelo Elementor simulado (ambiente local).', 'data' => array() ) );
}
add_action( 'wp_ajax_elementor_pro_forms_send_form', 'msslp_test_elementor_form' );
add_action( 'wp_ajax_nopriv_elementor_pro_forms_send_form', 'msslp_test_elementor_form' );

// Utilitários dos testes automatizados (somente neste ambiente local).
add_action( 'wp_ajax_nopriv_msslp_test', 'msslp_test_util' );
add_action( 'wp_ajax_msslp_test', 'msslp_test_util' );
function msslp_test_util() {
	$cmd = sanitize_key( $_REQUEST['cmd'] ?? '' );
	if ( 'set_mode' === $cmd ) {
		$s         = get_option( 'msslp_settings', array() );
		$s['mode'] = sanitize_key( $_REQUEST['mode'] ?? 'preview' );
		update_option( 'msslp_settings', $s );
	} elseif ( 'reset_log' === $cmd ) {
		delete_option( 'msslp_test_submissions' );
	}
	wp_send_json(
		array(
			'settings'    => get_option( 'msslp_settings' ),
			'submissions' => get_option( 'msslp_test_submissions', array() ),
			'wp'          => get_bloginfo( 'version' ),
			'theme'       => get_stylesheet(),
		)
	);
}
