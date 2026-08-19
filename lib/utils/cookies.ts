import { parseCookieHeader } from '../auth/cookies.ts';
import { TeyvatError } from '../client/errors.ts';
import { schema_teyvat_cookies, type TeyvatCookies } from '../types/index.ts';

export function _parse_cookies(cookies: TeyvatCookies | string): TeyvatCookies {
	try {
		return schema_teyvat_cookies.assert(typeof cookies === 'string' ? parseCookieHeader(cookies) : cookies);
	} catch (cause) {
		throw new TeyvatError('Invalid cookies', { cause });
	}
}
