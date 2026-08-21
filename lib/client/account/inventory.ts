import { TeyvatResponseValidationError } from '#/client/errors.ts';
import { _getHttpClient } from '#/client/request.ts';
import { _getHoyolabGenshinInventory, _getHoyolabTeyvatTree } from '#/endpoints/hoyolab/genshin/inventory.ts';
import { schemaTeyvatAccountInventory, type TeyvatAccountInventory } from '#/types/account/inventory.ts';
import { _getAccountOwner, type TeyvatAccount } from './index.ts';

const ENDPOINT = '/common/map_user/ys_obc/v1/user/sync_game_material_info';

function _inventoryInteger(value: number | string, field: string): number {
	if (typeof value === 'string' && !/^\d+$/.test(value)) throw new TypeError(`${field} must be an integer`);
	const numeric = Number(value);
	if (!Number.isSafeInteger(numeric) || numeric < 0)
		throw new TypeError(`${field} must be a nonnegative safe integer`);
	return numeric;
}

function _inventoryCounts(materialInfo: Record<string, number | string>): Map<number, number> {
	const counts = new Map<number, number>();
	for (const [rawId, rawCount] of Object.entries(materialInfo)) {
		const id = _inventoryInteger(rawId, 'material_info id');
		if (counts.has(id)) throw new TypeError(`material_info contains duplicate numeric id ${id}`);
		counts.set(id, _inventoryInteger(rawCount, `material_info.${rawId}`));
	}
	return counts;
}

function _treeItemIds(tree: Awaited<ReturnType<typeof _getHoyolabTeyvatTree>>): Set<number> {
	const ids = new Set<number>();
	for (const category of tree) {
		for (const item of category.children) {
			if (item.item_id === 0) continue;
			if (ids.has(item.id)) throw new TypeError(`Teyvat tree contains duplicate item id ${item.id}`);
			ids.add(item.id);
		}
	}
	return ids;
}

function _missingInventoryIds(
	counts: Map<number, number>,
	tree: Awaited<ReturnType<typeof _getHoyolabTeyvatTree>>,
): number[] {
	const treeIds = _treeItemIds(tree);
	return [...counts.keys()].filter((id) => !treeIds.has(id));
}

export async function _getAccountInventory(account: TeyvatAccount): Promise<TeyvatAccountInventory> {
	const client = _getHttpClient(_getAccountOwner(account));
	const [raw, initialTree] = await Promise.all([
		_getHoyolabGenshinInventory(client, account.uid, account.server),
		_getHoyolabTeyvatTree(client),
	]);

	try {
		const counts = _inventoryCounts(raw.material_info);
		let tree = initialTree;
		if (_missingInventoryIds(counts, tree).length > 0) tree = await _getHoyolabTeyvatTree(client, true);
		const missingIds = _missingInventoryIds(counts, tree);
		if (missingIds.length > 0)
			throw new TypeError(`Teyvat tree is missing ${missingIds.length} owned inventory item identifiers`);

		return schemaTeyvatAccountInventory.assert(
			tree
				.filter((category) => category.children.some((item) => item.item_id !== 0))
				.map((category) => ({
					id: category.id,
					name: category.name,
					items: category.children
						.filter((item) => item.item_id !== 0)
						.map((item) => ({
							id: item.id,
							itemId: item.item_id,
							name: item.name,
							icon: item.icon,
							count: counts.get(item.id) ?? 0,
						})),
				})),
		);
	} catch (cause) {
		throw new TeyvatResponseValidationError('GET', ENDPOINT, [String(cause)], { cause });
	}
}
