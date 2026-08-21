import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolab_headers } from '#/endpoints/hoyolab/headers.ts';
import type { TeyvatServer } from '#/types/account/server.ts';

export const schema_hoyolab_genshin_envisaged_echoes_response = type({
	retcode: '0',
	message: 'string',
	data: {
		list: type({
			avatar_id: 'number.integer',
			name: 'string',
			icon: 'string',
			status: 'number.integer',
			has_red_dot: 'boolean',
			level_id: 'number.integer',
		}).array(),
	},
});

export async function _get_hoyolab_genshin_envisaged_echoes(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshin_record,
		path: 'char_master',
		params: { role_id: uid, server },
		schema: schema_hoyolab_genshin_envisaged_echoes_response,
		headers: _hoyolab_headers(client.language),
	});
}
