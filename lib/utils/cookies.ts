import { _parseCookieHeader } from '#/auth/cookies.ts';
import { TeyvatError } from '#/client/errors.ts';
import { schemaTeyvatCookies, type TeyvatCookies } from '#/types/cookies.ts';

export function _parseCookies(cookies: TeyvatCookies | string): TeyvatCookies {
	try {
		return schemaTeyvatCookies.assert(typeof cookies === 'string' ? _parseCookieHeader(cookies) : cookies);
	} catch {
		throw new TeyvatError('Invalid cookies');
	}
}

export function _hoyolabIdFromCookies(cookies: TeyvatCookies, provided?: string): string {
	const ids = ['ltuid_v2', 'account_id_v2', 'ltuid', 'account_id']
		.map((name) => cookies[name])
		.filter((value): value is string => value !== undefined && value !== '');
	if (provided !== undefined) {
		if (!/^\d+$/.test(provided)) throw new TeyvatError('hoyolabId must contain only digits');
		if (ids.some((id) => id !== provided)) throw new TeyvatError('hoyolabId does not match the supplied cookies');
		return provided;
	}
	const [id] = ids;
	if (!id) throw new TeyvatError('Could not derive hoyolabId from cookies');
	if (!/^\d+$/.test(id)) throw new TeyvatError('Cookie account identifiers must contain only digits');
	if (ids.some((candidate) => candidate !== id)) throw new TeyvatError('Cookie account identifiers do not match');
	return id;
}
