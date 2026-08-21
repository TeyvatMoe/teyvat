import { type } from 'arktype';

export const schemaTeyvatCookies = type({
	'[string]': 'string',
});

/**
 * @interface
 * @useDeclaredType
 * @category Authentication
 */
export type TeyvatCookies = typeof schemaTeyvatCookies.infer;
