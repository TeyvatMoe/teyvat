import { type } from 'arktype';
import type { TeyvatHttpClient } from '../../client/request.ts';
import { TEYVAT_DOMAINS } from '../../consts/domains.ts';
import { _hoyolab_headers } from './headers.ts';

export const schema_hoyolab_change_setting_response = type({
	retcode: '0',
	message: 'string',
	data: 'unknown',
});

export async function _enable_hoyolab_genshin_daily_notes(client: TeyvatHttpClient): Promise<void> {
	await client.request({
		domain: TEYVAT_DOMAINS.hoyolab_card,
		path: 'changeDataSwitch',
		method: 'POST',
		body: { switch_id: 3, is_public: true, game_id: 2 },
		schema: schema_hoyolab_change_setting_response,
		headers: _hoyolab_headers(),
	});
}
