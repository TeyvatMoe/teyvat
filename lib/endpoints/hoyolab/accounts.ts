import { type } from 'arktype';
import type { TeyvatHttpClient } from '../../client/request.ts';
import { TEYVAT_DOMAINS } from '../../consts/domains.ts';
import { _hoyolab_headers } from './headers.ts';

export const schema_hoyolab_game_roles_response = type({
	retcode: '0',
	message: 'string',
	data: {
		list: [
			{
				game_biz: 'string',
				game_uid: 'string',
				nickname: 'string',
				region: 'string',
				region_name: 'string',
				level: 'number.integer',
				is_chosen: 'boolean',
				is_official: 'boolean',
			},
			'[]',
		],
	},
});

export async function _get_hoyolab_game_roles(client: TeyvatHttpClient) {
	return await client.request({
		domain: TEYVAT_DOMAINS.hoyolab_takumi,
		path: 'binding/api/getUserGameRolesByCookie',
		params: { game_biz: 'hk4e_global' },
		schema: schema_hoyolab_game_roles_response,
		headers: _hoyolab_headers(),
	});
}
