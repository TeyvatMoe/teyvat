import { type } from 'arktype';

const schemaTeyvatEnvisagedEchoStatus = type.enumerated('locked', 'unlocked', 'completed', 'unknown');
/**
 * @useDeclaredType
 * @category Envisaged Echoes
 */
export type TeyvatEnvisagedEchoStatus = typeof schemaTeyvatEnvisagedEchoStatus.infer;

export const schemaTeyvatAccountEnvisagedEcho = type({
	id: 'number.integer > 0',
	name: 'string',
	icon: 'string',
	status: schemaTeyvatEnvisagedEchoStatus,
	hasNotification: 'boolean',
	levelId: 'number.integer >= 0',
});

/**
 * @interface
 * @useDeclaredType
 * @category Envisaged Echoes
 */
export type TeyvatAccountEnvisagedEcho = typeof schemaTeyvatAccountEnvisagedEcho.infer;
