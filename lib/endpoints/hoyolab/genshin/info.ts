import { type } from 'arktype';
import type { TeyvatHttpClient } from '../../../client/request.ts';
import { TEYVAT_DOMAINS } from '../../../consts/domains.ts';
import type { TeyvatServer } from '../../../types/account/server.ts';
import { _hoyolab_headers } from '../headers.ts';

const schema_offering = type({
	name: 'string',
	level: 'number.integer',
	'icon?': 'string',
});

const schema_exploration = type({
	id: 'number.integer',
	parent_id: 'number.integer',
	name: 'string',
	exploration_percentage: 'number.integer',
	type: 'string',
	level: 'number.integer',
	icon: 'string',
	inner_icon: 'string',
	background_image: 'string',
	cover: 'string',
	map_url: 'string',
	'offerings?': schema_offering.array(),
	'boss_list?': type({ name: 'string', kill_num: 'number.integer' }).array(),
	'area_exploration_list?': type({ name: 'string', exploration_percentage: 'number.integer' }).array(),
	'natan_reputation?': type({
		tribal_list: type({
			id: 'number.integer',
			name: 'string',
			level: 'number.integer',
			icon: 'string',
			image: 'string',
		}).array(),
	}).or('null'),
});

const schema_home = type({
	name: 'string',
	icon: 'string',
	level: 'number.integer',
	visit_num: 'number.integer',
	comfort_num: 'number.integer',
	item_num: 'number.integer',
	comfort_level_name: 'string',
	comfort_level_icon: 'string',
});

const schema_homes_object = type({
	level: 'number.integer',
	visit_num: 'number.integer',
	comfort_num: 'number.integer',
	item_num: 'number.integer',
	comfort_level_name: 'string',
	comfort_level_icon: 'string',
	realms: type({ name: 'string', icon: 'string' }).array(),
});

export const schema_hoyolab_genshin_info_response = type({
	retcode: '0',
	message: 'string',
	data: {
		role: {
			AvatarUrl: 'string',
			'game_head_icon?': 'string | null',
			nickname: 'string',
			region: 'string',
			level: 'number.integer',
		},
		stats: {
			achievement_number: 'number.integer',
			active_day_number: 'number.integer',
			avatar_number: 'number.integer',
			spiral_abyss: 'string',
			anemoculus_number: 'number.integer',
			geoculus_number: 'number.integer',
			electroculus_number: 'number.integer',
			dendroculus_number: 'number.integer',
			hydroculus_number: 'number.integer',
			pyroculus_number: 'number.integer',
			moonoculus_number: 'number.integer',
			common_chest_number: 'number.integer',
			exquisite_chest_number: 'number.integer',
			precious_chest_number: 'number.integer',
			luxurious_chest_number: 'number.integer',
			magic_chest_number: 'number.integer',
			way_point_number: 'number.integer',
			domain_number: 'number.integer',
			full_fetter_avatar_num: 'number.integer',
			role_combat: {
				is_unlock: 'boolean',
				max_round_id: 'number.integer',
				has_data: 'boolean',
				has_detail_data: 'boolean',
			},
			hard_challenge: {
				is_unlock: 'boolean',
				difficulty: 'number.integer',
				name: 'string',
				has_data: 'boolean',
			},
		},
		world_explorations: schema_exploration.array(),
		homes: schema_home.array().or(schema_homes_object).or('null'),
	},
});

export async function _get_hoyolab_genshin_info(client: TeyvatHttpClient, uid: number, server: TeyvatServer) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshin_record,
		path: 'index',
		params: { role_id: uid, server, avatar_list_type: 0 },
		schema: schema_hoyolab_genshin_info_response,
		headers: _hoyolab_headers(),
	});
}
