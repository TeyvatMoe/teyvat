import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolabHeaders } from './headers.ts';

export const schemaHoyolabGameRolesResponse = type({
	retcode: '0',
	message: 'string',
	data: {
		list: type({
			['game_biz']: 'string',
			['game_uid']: 'string',
			nickname: 'string',
			region: 'string',
			['region_name']: 'string',
			level: 'number.integer',
			['is_chosen']: 'boolean',
			['is_official']: 'boolean',
		}).array(),
	},
});

export async function _getHoyolabGameRoles(client: TeyvatHttpClient) {
	return await client.request({
		domain: TEYVAT_DOMAINS.hoyolabTakumi,
		path: 'binding/api/getUserGameRolesByCookie',
		params: { ['game_biz']: 'hk4e_global' },
		schema: schemaHoyolabGameRolesResponse,
		headers: _hoyolabHeaders(client.language),
	});
}
