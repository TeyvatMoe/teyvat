import { type } from 'arktype';

export const schema_teyvat_cookies = type({
	'[string]': 'string',
});

export type TeyvatCookies = typeof schema_teyvat_cookies.infer;
