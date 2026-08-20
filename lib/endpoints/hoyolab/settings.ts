import { type } from 'arktype';
import type { TeyvatHttpClient } from '../../client/request.ts';
import { TEYVAT_DOMAINS } from '../../consts/domains.ts';
import { _hoyolab_headers } from './headers.ts';

export const schema_hoyolab_change_setting_response = type({
	retcode: '0',
	message: 'string',
	data: 'unknown',
});

async function _enable_hoyolab_genshin_setting(client: TeyvatHttpClient, switch_id: number): Promise<void> {
	await client.request({
		domain: TEYVAT_DOMAINS.hoyolab_card,
		path: 'changeDataSwitch',
		method: 'POST',
		body: { switch_id, is_public: true, game_id: 2 },
		schema: schema_hoyolab_change_setting_response,
		headers: _hoyolab_headers(),
	});
}

export async function _enable_hoyolab_genshin_battle_chronicle(client: TeyvatHttpClient): Promise<void> {
	await _enable_hoyolab_genshin_setting(client, 1);
}

export async function _enable_hoyolab_genshin_daily_notes(client: TeyvatHttpClient): Promise<void> {
	await _enable_hoyolab_genshin_battle_chronicle(client);
	await _enable_hoyolab_genshin_setting(client, 3);
}

export async function _enable_hoyolab_genshin_character_details(client: TeyvatHttpClient): Promise<void> {
	await _enable_hoyolab_genshin_battle_chronicle(client);
	await _enable_hoyolab_genshin_setting(client, 2);
}
