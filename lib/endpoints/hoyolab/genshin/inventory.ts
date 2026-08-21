import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import type { TeyvatServer } from '#/types/account/server.ts';
import type { TeyvatLanguage } from '#/types/language.ts';

const schemaMaterialInfo = type.Record('string', 'number | string');

const schemaHoyolabGenshinInventoryResponse = type({
	retcode: '0',
	message: 'string',
	data: {
		['material_info']: schemaMaterialInfo,
	},
});

const schemaTreeItem = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	['item_id']: 'number.integer',
});

const schemaTreeCategory = type({
	id: 'number.integer',
	name: 'string',
	children: schemaTreeItem.array(),
});

const schemaHoyolabTeyvatTreeResponse = type({
	retcode: '0',
	message: 'string',
	data: {
		tree: schemaTreeCategory.array(),
	},
});

type TeyvatTree = (typeof schemaHoyolabTeyvatTreeResponse.infer)['data']['tree'];

const TREE_CACHE_TTL = 3_600_000;
interface TeyvatTreeCache {
	tree?: TeyvatTree;
	updatedAt: number;
	refresh?: Promise<TeyvatTree>;
}

const treeCaches = new Map<TeyvatLanguage, TeyvatTreeCache>();

function _treeCache(language: TeyvatLanguage): TeyvatTreeCache {
	const existing = treeCaches.get(language);
	if (existing) return existing;
	const cache = { updatedAt: 0 };
	treeCaches.set(language, cache);
	return cache;
}

function _refreshTeyvatTree(client: TeyvatHttpClient, cache: TeyvatTreeCache): Promise<TeyvatTree> {
	if (cache.refresh) return cache.refresh;

	const refresh = client
		.request({
			domain: TEYVAT_DOMAINS.hoyolabMapStatic,
			path: 'tree',
			params: { ['map_id']: 2, ['app_sn']: 'ys_obc', lang: client.language },
			schema: schemaHoyolabTeyvatTreeResponse,
			skipAuth: true,
			useCookies: false,
		})
		.then((tree) => {
			cache.tree = tree.tree;
			cache.updatedAt = Date.now();
			return tree.tree;
		})
		.finally(() => {
			if (cache.refresh === refresh) cache.refresh = undefined;
		});
	cache.refresh = refresh;
	return refresh;
}

export async function _getHoyolabTeyvatTree(client: TeyvatHttpClient, force = false): Promise<TeyvatTree> {
	const cache = _treeCache(client.language);
	if (force || !cache.tree) return await _refreshTeyvatTree(client, cache);
	if (Date.now() - cache.updatedAt >= TREE_CACHE_TTL) void _refreshTeyvatTree(client, cache).catch(() => undefined);
	return cache.tree;
}

export async function _getHoyolabGenshinInventory(client: TeyvatHttpClient, uid: number, server: TeyvatServer) {
	return await client.request({
		domain: TEYVAT_DOMAINS.hoyolabMap,
		path: 'sync_game_material_info',
		params: { ['map_id']: 2, ['app_sn']: 'ys_obc', lang: client.language, uid, region: server },
		schema: schemaHoyolabGenshinInventoryResponse,
		headers: {
			['Origin']: 'https://act.hoyolab.com',
			['Referer']: 'https://act.hoyolab.com/ys/app/interactive-map/index.html#/map/2',
			'x-rpc-platform': '4',
			'x-rpc-view_source': '1',
		},
	});
}
