import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolabHeaders } from '#/endpoints/hoyolab/headers.ts';
import type { TeyvatServer } from '#/types/account/server.ts';

const schemaCategory = type({
	id: 'string',
	name: 'string',
	icon: 'string',
	['finish_num']: 'number.integer',
	percentage: 'number',
	['show_percent']: 'boolean',
});

const schemaHoyolabGenshinAchievementsResponse = type({
	retcode: '0',
	message: 'string',
	data: {
		['achievement_num']: 'number.integer',
		list: schemaCategory.array(),
	},
});

export async function _getHoyolabGenshinAchievements(client: TeyvatHttpClient, uid: number, server: TeyvatServer) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshinRecord,
		path: 'achievement',
		method: 'POST',
		body: { ['role_id']: uid, server },
		schema: schemaHoyolabGenshinAchievementsResponse,
		headers: _hoyolabHeaders(client.language),
	});
}
