import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolab_headers } from '#/endpoints/hoyolab/headers.ts';
import type { TeyvatServer } from '#/types/account/server.ts';

const schema_base = {
	uid: 'number.integer',
	region: 'string',
	nickname: 'string',
	data_month: 'number.integer',
	optional_month: type('number.integer').array(),
} as const;

const schema_source = type({
	action_id: 'number.integer',
	action: 'string',
	num: 'number.integer',
	percent: 'number.integer',
});

export const schema_hoyolab_genshin_traveler_diary_response = type({
	retcode: '0',
	message: 'string',
	data: {
		...schema_base,
		month: 'number.integer',
		month_data: {
			current_primogems: 'number.integer',
			current_mora: 'number.integer',
			last_primogems: 'number.integer',
			last_mora: 'number.integer',
			primogem_rate: 'number.integer',
			mora_rate: 'number.integer',
			group_by: schema_source.array(),
		},
		day_data: {
			current_primogems: 'number.integer',
			current_mora: 'number.integer',
		},
	},
});

const schema_entry = type({
	action_id: 'number.integer',
	action: 'string',
	time: 'string',
	num: 'number.integer',
});

export const schema_hoyolab_genshin_traveler_diary_log_response = type({
	retcode: '0',
	message: 'string',
	data: {
		...schema_base,
		current_page: 'number.integer',
		list: schema_entry.array(),
	},
});

export async function _get_hoyolab_genshin_traveler_diary(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
	month: number,
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshin_diary,
		path: 'month_info',
		params: { uid, region: server, month, lang: client.language },
		schema: schema_hoyolab_genshin_traveler_diary_response,
		headers: _hoyolab_headers(client.language),
	});
}

export async function _get_hoyolab_genshin_traveler_diary_log_page(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
	month: number,
	currency_type: 1 | 2,
	page: number,
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshin_diary,
		path: 'month_detail',
		params: {
			uid,
			region: server,
			month,
			lang: client.language,
			type: currency_type,
			current_page: page,
			page_size: 100,
		},
		schema: schema_hoyolab_genshin_traveler_diary_log_response,
		headers: _hoyolab_headers(client.language),
	});
}
