import { type } from 'arktype';
import { TeyvatApiError, TeyvatCodeRedemptionError, TeyvatRequestError } from '#/client/errors.ts';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import type { TeyvatServer } from '#/types/account/server.ts';
import { _short_language } from '#/utils/misc.ts';

const ENDPOINT = 'https://public-operation-hk4e.hoyoverse.com/common/apicdkey/api/webExchangeCdkey';

const schema_hoyolab_code_redemption_response = type({
	retcode: '0',
	message: 'string',
	data: 'object | null',
});

const reasons = new Map<number, TeyvatCodeRedemptionError['reason']>([
	[-1065, 'invalid'],
	[-2001, 'expired'],
	[-2003, 'malformed'],
	[-2004, 'invalid'],
	[-2006, 'usage_limit_reached'],
	[-2008, 'region_locked'],
	[-2014, 'not_active'],
	[-2016, 'cooldown'],
	[-2017, 'already_redeemed'],
	[-2018, 'already_redeemed'],
	[-2021, 'level_too_low'],
	[-2011, 'level_too_low'],
]);

export async function _redeem_hoyolab_genshin_code(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
	code: string,
): Promise<void> {
	try {
		await client.request({
			domain: TEYVAT_DOMAINS.genshin_redemption,
			path: 'webExchangeCdkey',
			params: {
				uid,
				region: server,
				lang: _short_language(client.language),
				cdkey: code,
				game_biz: 'hk4e_global',
			},
			headers: {
				Origin: 'https://genshin.hoyoverse.com',
				Referer: 'https://genshin.hoyoverse.com/',
			},
			replay_auth: false,
			schema: schema_hoyolab_code_redemption_response,
		});
	} catch (cause) {
		if (cause instanceof TeyvatApiError) {
			const reason = reasons.get(cause.retcode);
			if (reason) throw new TeyvatCodeRedemptionError(reason, cause.retcode, ENDPOINT);
			throw new TeyvatApiError(cause.retcode, 'Code redemption failed', 'GET', ENDPOINT);
		}
		if (cause instanceof TeyvatRequestError) {
			throw new TeyvatRequestError(cause.kind, cause.method, cause.endpoint, cause.message, {
				status: cause.status,
			});
		}
		throw cause;
	}
}
