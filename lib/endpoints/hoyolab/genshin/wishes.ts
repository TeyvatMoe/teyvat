import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _shortLanguage } from '#/utils/misc.ts';

const schemaWish = type({
	uid: 'string',
	id: 'string',
	name: 'string',
	['item_type']: 'string',
	['rank_type']: 'string',
	time: 'string',
});

export const schemaHoyolabGenshinWishesResponse = type({
	retcode: '0',
	message: 'string',
	data: {
		page: 'string',
		size: 'string',
		list: schemaWish.array(),
		region: 'string',
	},
});

export async function _getHoyolabGenshinWishes(
	client: TeyvatHttpClient,
	authkey: string,
	bannerType: number,
	endId: string,
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshinWishes,
		path: 'getGachaLog',
		params: {
			['authkey_ver']: 1,
			authkey,
			lang: _shortLanguage(client.language),
			['game_biz']: 'hk4e_global',
			['gacha_type']: bannerType,
			['real_gacha_type']: bannerType,
			size: 20,
			['end_id']: endId,
		},
		schema: schemaHoyolabGenshinWishesResponse,
		useCookies: false,
		skipAuth: true,
	});
}
