import { type } from 'arktype';

const schema_teyvat_envisaged_echo_status = type.enumerated('locked', 'unlocked', 'completed', 'unknown');
/**
 * @useDeclaredType
 * @category Envisaged Echoes
 */
export type TeyvatEnvisagedEchoStatus = typeof schema_teyvat_envisaged_echo_status.infer;

export const schema_teyvat_account_envisaged_echo = type({
	id: 'number.integer > 0',
	name: 'string',
	icon: 'string',
	status: schema_teyvat_envisaged_echo_status,
	has_notification: 'boolean',
	level_id: 'number.integer >= 0',
});

/**
 * @interface
 * @useDeclaredType
 * @category Envisaged Echoes
 */
export type TeyvatAccountEnvisagedEcho = typeof schema_teyvat_account_envisaged_echo.infer;
