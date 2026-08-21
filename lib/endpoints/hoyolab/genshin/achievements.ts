import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolab_headers } from '#/endpoints/hoyolab/headers.ts';
import type { TeyvatServer } from '#/types/account/server.ts';

const schema_category = type({
	id: 'string',
	name: 'string',
	icon: 'string',
	finish_num: 'number.integer',
	percentage: 'number',
	show_percent: 'boolean',
});

export const schema_hoyolab_genshin_achievements_response = type({
	retcode: '0',
	message: 'string',
	data: {
		achievement_num: 'number.integer',
		list: schema_category.array(),
	},
});

export async function _get_hoyolab_genshin_achievements(client: TeyvatHttpClient, uid: number, server: TeyvatServer) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshin_record,
		path: 'achievement',
		method: 'POST',
		body: { role_id: uid, server },
		schema: schema_hoyolab_genshin_achievements_response,
		headers: _hoyolab_headers(client.language),
	});
}
