import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolabHeaders } from '#/endpoints/hoyolab/headers.ts';
import type { TeyvatServer } from '#/types/account/server.ts';

const schemaCountdown = type('string');

export const schemaHoyolabGenshinDailyNotesResponse = type({
	retcode: '0',
	message: 'string',
	data: {
		['current_resin']: 'number.integer',
		['max_resin']: 'number.integer',
		['resin_recovery_time']: schemaCountdown,
		['current_home_coin']: 'number.integer',
		['max_home_coin']: 'number.integer',
		['home_coin_recovery_time']: schemaCountdown,
		['finished_task_num']: 'number.integer',
		['total_task_num']: 'number.integer',
		['is_extra_task_reward_received']: 'boolean',
		['remain_resin_discount_num']: 'number.integer',
		['resin_discount_num_limit']: 'number.integer',
		['max_expedition_num']: 'number.integer',
		expeditions: type({
			['avatar_side_icon']: 'string',
			status: 'string',
			['remained_time']: schemaCountdown,
		}).array(),
		transformer: {
			obtained: 'boolean',
			'recovery_time?': {
				['Day']: 'number.integer',
				['Hour']: 'number.integer',
				['Minute']: 'number.integer',
				['Second']: 'number.integer',
				reached: 'boolean',
			},
		},
		['daily_task']: {
			['total_num']: 'number.integer',
			['finished_num']: 'number.integer',
			['is_extra_task_reward_received']: 'boolean',
			['task_rewards']: type({ status: 'string' }).array(),
			['attendance_rewards']: type({ status: 'string', progress: 'number.integer' }).array(),
			['attendance_visible']: 'boolean',
			['stored_attendance']: 'string',
			'attendance_refresh_time?': 'string | null',
		},
		['archon_quest_progress']: {
			list: type({
				id: 'number.integer',
				status: 'string',
				['chapter_num']: 'string',
				['chapter_title']: 'string',
			}).array(),
			['is_finish_all_mainline']: 'boolean',
			['is_open_archon_quest']: 'boolean',
			['is_finish_all_interchapter']: 'boolean',
		},
	},
});

export async function _getHoyolabGenshinDailyNotes(client: TeyvatHttpClient, uid: number, server: TeyvatServer) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshinRecord,
		path: 'dailyNote',
		params: { ['role_id']: uid, server },
		schema: schemaHoyolabGenshinDailyNotesResponse,
		headers: _hoyolabHeaders(client.language),
	});
}
