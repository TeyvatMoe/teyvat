import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolabHeaders } from './headers.ts';

const schemaCertification = type({
	type: 'number.integer',
	['icon_url?']: 'string | null',
	['desc?']: 'string | null',
});

const schemaLevel = type({
	level: 'number.integer >= 0',
	exp: 'number.integer >= 0',
	['level_desc']: 'string',
	['bg_color']: 'string',
	['bg_image']: 'string',
});

const schemaHoyolabProfileResponse = type({
	retcode: '0',
	message: 'string',
	data: {
		['user_info']: {
			uid: 'string | number.integer',
			nickname: 'string',
			introduce: 'string',
			avatar: 'string | number.integer',
			gender: 'number.integer',
			['avatar_url']: 'string',
			pendant: 'string',
			['bg_url?']: 'string | null',
			['pc_bg_url?']: 'string | null',
			['certification?']: schemaCertification.or('null'),
			['level?']: schemaLevel.or('null'),
		},
	},
});

export async function _getHoyolabProfile(client: TeyvatHttpClient) {
	return await client.request({
		domain: TEYVAT_DOMAINS.hoyolabBbs,
		path: 'community/painter/wapi/user/full',
		schema: schemaHoyolabProfileResponse,
		headers: {
			..._hoyolabHeaders(client.language),
			['Referer']: 'https://www.hoyolab.com/',
		},
	});
}
