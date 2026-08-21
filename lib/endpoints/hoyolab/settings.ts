import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolabHeaders } from './headers.ts';

const schemaHoyolabChangeSettingResponse = type({
	retcode: '0',
	message: 'string',
	data: 'unknown',
});

export async function _enableHoyolabGenshinSetting(client: TeyvatHttpClient, switchId: number): Promise<void> {
	await client.request({
		domain: TEYVAT_DOMAINS.hoyolabCard,
		path: 'changeDataSwitch',
		method: 'POST',
		body: { ['switch_id']: switchId, ['is_public']: true, ['game_id']: 2 },
		schema: schemaHoyolabChangeSettingResponse,
		headers: _hoyolabHeaders(client.language),
	});
}
