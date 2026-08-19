import { type } from 'arktype';

export const schema_teyvat_cookies = type({
	cookie_token_v2: 'string',
	account_mid_v2: 'string',
	ltoken_v2: 'string',
	ltmid_v2: 'string',
	ltuid_v2: 'number',
});

export type TeyvatCookies = typeof schema_teyvat_cookies.infer;
