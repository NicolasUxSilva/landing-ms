<?php
/**
 * Plugin Name:       MSSERVER Landing Servidores Dedicados
 * Description:       Serve a landing page aprovada de servidores dedicados (com simulador) na URL de uma página existente, isolada do tema e dos estilos de outros plugins.
 * Version:           1.0.0
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            MSSERVER
 * License:           Proprietary
 * Text Domain:       msserver-landing-servidores
 */

defined( 'ABSPATH' ) || exit;

define( 'MSSLP_VERSION', '1.0.0' );
define( 'MSSLP_FILE', __FILE__ );
define( 'MSSLP_DIR', plugin_dir_path( __FILE__ ) );
define( 'MSSLP_URL', plugin_dir_url( __FILE__ ) );
define( 'MSSLP_OPTION', 'msslp_settings' );
// Slug da página atual da campanha. Usado só para localizar a página na ativação.
define( 'MSSLP_DEFAULT_SLUG', 'servidores-dedicados-para-empresas' );

require_once MSSLP_DIR . 'includes/settings.php';
require_once MSSLP_DIR . 'includes/tracking.php';
require_once MSSLP_DIR . 'includes/render.php';

register_activation_hook( __FILE__, 'msslp_activate' );

/**
 * Na primeira ativação a landing fica em modo "prévia" (só administradores a
 * veem com ?msslp=preview). Reativações preservam as configurações existentes.
 */
function msslp_activate() {
	$current = get_option( MSSLP_OPTION );
	if ( is_array( $current ) ) {
		return;
	}
	$settings = msslp_default_settings();
	$page     = get_page_by_path( MSSLP_DEFAULT_SLUG );
	if ( $page instanceof WP_Post ) {
		$settings['page_id'] = (int) $page->ID;
	}
	add_option( MSSLP_OPTION, $settings, '', false );
}
