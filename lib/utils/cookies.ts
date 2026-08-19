import { _parse_cookie_header } from '../auth/cookies.ts';
import { TeyvatError } from '../client/errors.ts';
import { schema_teyvat_cookies, type TeyvatCookies } from '../types/index.ts';

export function _parse_cookies(cookies: TeyvatCookies | string): TeyvatCookies {
	try {
		return schema_teyvat_cookies.assert(typeof cookies === 'string' ? _parse_cookie_header(cookies) : cookies);
	} catch (cause) {
		throw new TeyvatError('Invalid cookies', { cause });
	}
}
