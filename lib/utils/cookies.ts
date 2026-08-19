import { TeyvatError } from '../client/index.ts';
import { schema_teyvat_cookies, type TeyvatCookies } from '../types/index.ts';

export function _parse_cookies(cookies: string): TeyvatCookies {
	try {
		return schema_teyvat_cookies.assert(
			Object.fromEntries(
				cookies
					.split(';')
					.map((cookie) => cookie.trim())
					.filter(Boolean)
					.map((cookie) => {
						const i = cookie.indexOf('=');

						return i === -1 ? [cookie, ''] : [cookie.slice(0, i), cookie.slice(i + 1)];
					}),
			),
		);
	} catch (_e) {
		throw new TeyvatError('');
	}
}
