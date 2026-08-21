import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolabHeaders } from '#/endpoints/hoyolab/headers.ts';
import type { TeyvatServer } from '#/types/account/server.ts';

const schemaBase = {
	uid: 'number.integer',
	region: 'string',
	nickname: 'string',
	['data_month']: 'number.integer',
	['optional_month']: type('number.integer').array(),
} as const;

const schemaSource = type({
	['action_id']: 'number.integer',
	action: 'string',
	num: 'number.integer',
	percent: 'number.integer',
});

const schemaHoyolabGenshinTravelerDiaryResponse = type({
	retcode: '0',
	message: 'string',
	data: {
		...schemaBase,
		month: 'number.integer',
		['month_data']: {
			['current_primogems']: 'number.integer',
			['current_mora']: 'number.integer',
			['last_primogems']: 'number.integer',
			['last_mora']: 'number.integer',
			['primogem_rate']: 'number.integer',
			['mora_rate']: 'number.integer',
			['group_by']: schemaSource.array(),
		},
		['day_data']: {
			['current_primogems']: 'number.integer',
			['current_mora']: 'number.integer',
		},
	},
});

const schemaEntry = type({
	['action_id']: 'number.integer',
	action: 'string',
	time: 'string',
	num: 'number.integer',
});

const schemaHoyolabGenshinTravelerDiaryLogResponse = type({
	retcode: '0',
	message: 'string',
	data: {
		...schemaBase,
		['current_page']: 'number.integer',
		list: schemaEntry.array(),
	},
});

export async function _getHoyolabGenshinTravelerDiary(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
	month: number,
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshinDiary,
		path: 'month_info',
		params: { uid, region: server, month, lang: client.language },
		schema: schemaHoyolabGenshinTravelerDiaryResponse,
		headers: _hoyolabHeaders(client.language),
	});
}

export async function _getHoyolabGenshinTravelerDiaryLogPage(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
	month: number,
	currencyType: 1 | 2,
	page: number,
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshinDiary,
		path: 'month_detail',
		params: {
			uid,
			region: server,
			month,
			lang: client.language,
			type: currencyType,
			['current_page']: page,
			['page_size']: 100,
		},
		schema: schemaHoyolabGenshinTravelerDiaryLogResponse,
		headers: _hoyolabHeaders(client.language),
	});
}
