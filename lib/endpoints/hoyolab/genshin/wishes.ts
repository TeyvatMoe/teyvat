import { type } from 'arktype';
import type { TeyvatHttpClient } from '../../../client/request.ts';
import { TEYVAT_DOMAINS } from '../../../consts/domains.ts';

const schema_wish = type({
	uid: 'string',
	id: 'string',
	name: 'string',
	item_type: 'string',
	rank_type: 'string',
	time: 'string',
});

export const schema_hoyolab_genshin_wishes_response = type({
	retcode: '0',
	message: 'string',
	data: {
		page: 'string',
		size: 'string',
		list: schema_wish.array(),
		region: 'string',
	},
});

export async function _get_hoyolab_genshin_wishes(
	client: TeyvatHttpClient,
	authkey: string,
	banner_type: number,
	end_id: string,
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshin_wishes,
		path: 'getGachaLog',
		params: {
			authkey_ver: 1,
			authkey,
			lang: 'en-us',
			game_biz: 'hk4e_global',
			gacha_type: banner_type,
			real_gacha_type: banner_type,
			size: 20,
			end_id,
		},
		schema: schema_hoyolab_genshin_wishes_response,
		use_cookies: false,
		skip_auth: true,
	});
}
