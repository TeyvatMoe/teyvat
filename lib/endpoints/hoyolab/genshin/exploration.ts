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

const schema_boss = type({
	name: 'string',
	kill_num: 'number.integer',
});

const schema_area = type({
	name: 'string',
	exploration_percentage: 'number.integer',
});

const schema_natlan_tribe = type({
	id: 'number.integer',
	name: 'string',
	level: 'number.integer',
	icon: 'string',
	image: 'string',
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
	'boss_list?': schema_boss.array(),
	'area_exploration_list?': schema_area.array(),
	'natan_reputation?': type({ tribal_list: schema_natlan_tribe.array() }).or('null'),
});

export const schema_hoyolab_genshin_exploration_response = type({
	retcode: '0',
	message: 'string',
	data: {
		world_explorations: schema_exploration.array(),
	},
});

export async function _get_hoyolab_genshin_exploration(client: TeyvatHttpClient, uid: number, server: TeyvatServer) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshin_record,
		path: 'index',
		params: { role_id: uid, server, avatar_list_type: 0 },
		schema: schema_hoyolab_genshin_exploration_response,
		headers: _hoyolab_headers(),
	});
}
