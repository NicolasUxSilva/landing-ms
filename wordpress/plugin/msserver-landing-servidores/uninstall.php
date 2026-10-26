<?php
/**
 * Remove as configurações ao excluir o plugin. A página do WordPress não é alterada.
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( 'msslp_settings' );
