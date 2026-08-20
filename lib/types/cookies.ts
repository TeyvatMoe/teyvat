import { type } from 'arktype';

export const schema_teyvat_cookies = type({
	'[string]': 'string',
});

/**
 * @interface
 * @useDeclaredType
 * @category Authentication
 */
export type TeyvatCookies = typeof schema_teyvat_cookies.infer;
