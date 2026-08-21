import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import type { TeyvatServer } from '#/types/account/server.ts';
import type { TeyvatLanguage } from '#/types/language.ts';

const schema_material_info = type.Record('string', 'number | string');

export const schema_hoyolab_genshin_inventory_response = type({
	retcode: '0',
	message: 'string',
	data: {
		material_info: schema_material_info,
	},
});

const schema_tree_item = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	item_id: 'number.integer',
});

const schema_tree_category = type({
	id: 'number.integer',
	name: 'string',
	children: schema_tree_item.array(),
});

export const schema_hoyolab_teyvat_tree_response = type({
	retcode: '0',
	message: 'string',
	data: {
		tree: schema_tree_category.array(),
	},
});

type TeyvatTree = (typeof schema_hoyolab_teyvat_tree_response.infer)['data']['tree'];

const TREE_CACHE_TTL = 3_600_000;
interface TeyvatTreeCache {
	tree?: TeyvatTree;
	updated_at: number;
	refresh?: Promise<TeyvatTree>;
}

const tree_caches = new Map<TeyvatLanguage, TeyvatTreeCache>();

function _tree_cache(language: TeyvatLanguage): TeyvatTreeCache {
	const existing = tree_caches.get(language);
	if (existing) return existing;
	const cache = { updated_at: 0 };
	tree_caches.set(language, cache);
	return cache;
}

function _refresh_teyvat_tree(client: TeyvatHttpClient, cache: TeyvatTreeCache): Promise<TeyvatTree> {
	if (cache.refresh) return cache.refresh;

	const refresh = client
		.request({
			domain: TEYVAT_DOMAINS.hoyolab_map_static,
			path: 'tree',
			params: { map_id: 2, app_sn: 'ys_obc', lang: client.language },
			schema: schema_hoyolab_teyvat_tree_response,
			skip_auth: true,
			use_cookies: false,
		})
		.then((tree) => {
			cache.tree = tree.tree;
			cache.updated_at = Date.now();
			return tree.tree;
		})
		.finally(() => {
			if (cache.refresh === refresh) cache.refresh = undefined;
		});
	cache.refresh = refresh;
	return refresh;
}

export async function _get_hoyolab_teyvat_tree(client: TeyvatHttpClient, force = false): Promise<TeyvatTree> {
	const cache = _tree_cache(client.language);
	if (force || !cache.tree) return await _refresh_teyvat_tree(client, cache);
	if (Date.now() - cache.updated_at >= TREE_CACHE_TTL)
		void _refresh_teyvat_tree(client, cache).catch(() => undefined);
	return cache.tree;
}

export async function _get_hoyolab_genshin_inventory(client: TeyvatHttpClient, uid: number, server: TeyvatServer) {
	return await client.request({
		domain: TEYVAT_DOMAINS.hoyolab_map,
		path: 'sync_game_material_info',
		params: { map_id: 2, app_sn: 'ys_obc', lang: client.language, uid, region: server },
		schema: schema_hoyolab_genshin_inventory_response,
		headers: {
			Origin: 'https://act.hoyolab.com',
			Referer: 'https://act.hoyolab.com/ys/app/interactive-map/index.html#/map/2',
			'x-rpc-platform': '4',
			'x-rpc-view_source': '1',
		},
	});
}
