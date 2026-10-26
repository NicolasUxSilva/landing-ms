<?php
/**
 * Configurações do plugin (Configurações → Landing Servidores).
 */

defined( 'ABSPATH' ) || exit;

function msslp_default_settings() {
	return array(
		'mode'             => 'preview', // off | preview | live
		'page_id'          => 0,
		'tracking'         => array( 'gtm', 'gtag', 'meta', 'clarity' ),
		'gtm_fallback'     => '',
		'head_extra'       => '',
		'test_submissions' => 1,
	);
}

function msslp_settings() {
	$saved = get_option( MSSLP_OPTION );
	return wp_parse_args( is_array( $saved ) ? $saved : array(), msslp_default_settings() );
}

function msslp_manifest() {
	static $manifest = null;
	if ( null === $manifest ) {
		$file     = MSSLP_DIR . 'app/manifest.json';
		$manifest = is_readable( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : array();
		$manifest = is_array( $manifest ) ? $manifest : array();
	}
	return $manifest;
}

add_action( 'admin_menu', 'msslp_admin_menu' );
add_action( 'admin_init', 'msslp_register_settings' );
add_filter( 'plugin_action_links_' . plugin_basename( MSSLP_FILE ), 'msslp_action_links' );

function msslp_admin_menu() {
	add_options_page( 'Landing Servidores Dedicados', 'Landing Servidores', 'manage_options', 'msslp', 'msslp_settings_page' );
}

function msslp_action_links( $links ) {
	array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=msslp' ) ) . '">Configurações</a>' );
	return $links;
}

function msslp_register_settings() {
	register_setting(
		'msslp',
		MSSLP_OPTION,
		array(
			'type'              => 'array',
			'sanitize_callback' => 'msslp_sanitize',
		)
	);
}

function msslp_sanitize( $input ) {
	$input    = is_array( $input ) ? $input : array();
	$previous = msslp_settings();
	$groups   = array_keys( msslp_tracking_groups() );

	$out = array(
		'mode'             => in_array( $input['mode'] ?? '', array( 'off', 'preview', 'live' ), true ) ? $input['mode'] : 'preview',
		'page_id'          => absint( $input['page_id'] ?? 0 ),
		'tracking'         => array_values( array_intersect( $groups, (array) ( $input['tracking'] ?? array() ) ) ),
		'gtm_fallback'     => preg_match( '/^GTM-[A-Z0-9]{4,12}$/', strtoupper( trim( (string) ( $input['gtm_fallback'] ?? '' ) ) ) ) ? strtoupper( trim( $input['gtm_fallback'] ) ) : '',
		'head_extra'       => $previous['head_extra'],
		'test_submissions' => empty( $input['test_submissions'] ) ? 0 : 1,
	);
	// Código livre no <head> só pode ser alterado por quem pode publicar HTML sem filtro.
	if ( current_user_can( 'unfiltered_html' ) && isset( $input['head_extra'] ) ) {
		$out['head_extra'] = trim( (string) wp_unslash( $input['head_extra'] ) );
	}
	return $out;
}

function msslp_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$s        = msslp_settings();
	$manifest = msslp_manifest();
	$page_url = $s['page_id'] ? get_permalink( $s['page_id'] ) : '';
	$name     = MSSLP_OPTION;
	$app_ok   = is_readable( MSSLP_DIR . 'app/index.html' );
	?>
	<div class="wrap">
		<h1>Landing Servidores Dedicados</h1>

		<?php if ( ! $app_ok ) : ?>
			<div class="notice notice-error"><p>Arquivos da landing não encontrados em <code>app/</code>. Reinstale o plugin a partir do pacote gerado por <code>npm run build:wp</code>. Enquanto isso, a página original continua no ar.</p></div>
		<?php endif; ?>

		<table class="widefat striped" style="max-width:760px;margin:1rem 0 1.5rem">
			<tbody>
				<tr><th>Versão do plugin</th><td><?php echo esc_html( MSSLP_VERSION ); ?></td></tr>
				<tr><th>Build da landing</th><td><?php echo esc_html( $manifest['builtAt'] ?? '—' ); ?></td></tr>
				<tr><th>Catálogo de preços</th><td><?php echo esc_html( $manifest['catalogFetchedAt'] ?? '—' ); ?></td></tr>
				<?php if ( $page_url ) : ?>
					<tr><th>Prévia (só administradores)</th><td><a href="<?php echo esc_url( add_query_arg( 'msslp', 'preview', $page_url ) ); ?>" target="_blank"><?php echo esc_html( add_query_arg( 'msslp', 'preview', $page_url ) ); ?></a></td></tr>
					<tr><th>Página original (comparação)</th><td><a href="<?php echo esc_url( add_query_arg( 'msslp', 'original', $page_url ) ); ?>" target="_blank"><?php echo esc_html( add_query_arg( 'msslp', 'original', $page_url ) ); ?></a></td></tr>
				<?php endif; ?>
			</tbody>
		</table>

		<form method="post" action="options.php">
			<?php settings_fields( 'msslp' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row">Modo</th>
					<td>
						<fieldset>
							<label><input type="radio" name="<?php echo esc_attr( $name ); ?>[mode]" value="off" <?php checked( $s['mode'], 'off' ); ?>> Desativado: a página mostra o conteúdo original do WordPress.</label><br>
							<label><input type="radio" name="<?php echo esc_attr( $name ); ?>[mode]" value="preview" <?php checked( $s['mode'], 'preview' ); ?>> Prévia: visitantes veem o original; administradores veem a landing com <code>?msslp=preview</code> (sem indexação e sem cache).</label><br>
							<label><input type="radio" name="<?php echo esc_attr( $name ); ?>[mode]" value="live" <?php checked( $s['mode'], 'live' ); ?>> No ar: todos os visitantes veem a landing nesta URL.</label>
						</fieldset>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="msslp-page">Página</label></th>
					<td>
						<?php
						wp_dropdown_pages(
							array(
								'name'              => esc_attr( $name ) . '[page_id]',
								'id'                => 'msslp-page',
								'selected'          => (int) $s['page_id'],
								'show_option_none'  => '— Selecione —',
								'option_none_value' => '0',
								'post_status'       => array( 'publish', 'private', 'draft' ),
							)
						);
						?>
						<p class="description">A landing ocupa a URL desta página. O conteúdo original (Elementor) não é alterado e volta a aparecer ao desativar.</p>
					</td>
				</tr>
				<tr>
					<th scope="row">Rastreamento do site</th>
					<td>
						<fieldset>
							<?php foreach ( msslp_tracking_groups() as $key => $group ) : ?>
								<label><input type="checkbox" name="<?php echo esc_attr( $name ); ?>[tracking][]" value="<?php echo esc_attr( $key ); ?>" <?php checked( in_array( $key, $s['tracking'], true ) ); ?>> <?php echo esc_html( $group['label'] ); ?></label><br>
							<?php endforeach; ?>
						</fieldset>
						<p class="description">Os scripts marcados são copiados do que o WordPress já imprime (wp_head, wp_body_open, wp_footer). Estilos e demais scripts do tema e de plugins não entram na landing.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="msslp-gtm">GTM de reserva</label></th>
					<td>
						<input id="msslp-gtm" class="regular-text" name="<?php echo esc_attr( $name ); ?>[gtm_fallback]" value="<?php echo esc_attr( $s['gtm_fallback'] ); ?>" placeholder="GTM-XXXXXXX">
						<p class="description">Só é usado se nenhum Google Tag Manager for encontrado no rastreamento do site.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="msslp-head">Código extra no &lt;head&gt;</label></th>
					<td>
						<textarea id="msslp-head" class="large-text code" rows="5" name="<?php echo esc_attr( $name ); ?>[head_extra]" <?php disabled( ! current_user_can( 'unfiltered_html' ) ); ?>><?php echo esc_textarea( $s['head_extra'] ); ?></textarea>
					</td>
				</tr>
				<tr>
					<th scope="row">Envios na prévia</th>
					<td>
						<label><input type="checkbox" name="<?php echo esc_attr( $name ); ?>[test_submissions]" value="1" <?php checked( $s['test_submissions'], 1 ); ?>> Responder envios feitos na prévia como teste, sem passar o lead para o formulário do Elementor.</label>
					</td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}
