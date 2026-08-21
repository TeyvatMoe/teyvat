import { TeyvatResponseValidationError } from '#/client/errors.ts';
import { _get_http_client } from '#/client/request.ts';
import { _get_hoyolab_genshin_inventory, _get_hoyolab_teyvat_tree } from '#/endpoints/hoyolab/genshin/inventory.ts';
import { schema_teyvat_account_inventory, type TeyvatAccountInventory } from '#/types/account/inventory.ts';
import type { TeyvatAccount } from './index.ts';

const ENDPOINT = '/common/map_user/ys_obc/v1/user/sync_game_material_info';

function _inventory_integer(value: number | string, field: string): number {
	if (typeof value === 'string' && !/^\d+$/.test(value)) throw new TypeError(`${field} must be an integer`);
	const numeric = Number(value);
	if (!Number.isSafeInteger(numeric) || numeric < 0)
		throw new TypeError(`${field} must be a nonnegative safe integer`);
	return numeric;
}

function _inventory_counts(material_info: Record<string, number | string>): Map<number, number> {
	const counts = new Map<number, number>();
	for (const [raw_id, raw_count] of Object.entries(material_info)) {
		const id = _inventory_integer(raw_id, 'material_info id');
		if (counts.has(id)) throw new TypeError(`material_info contains duplicate numeric id ${id}`);
		counts.set(id, _inventory_integer(raw_count, `material_info.${raw_id}`));
	}
	return counts;
}

function _tree_item_ids(tree: Awaited<ReturnType<typeof _get_hoyolab_teyvat_tree>>): Set<number> {
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

function _missing_inventory_ids(
	counts: Map<number, number>,
	tree: Awaited<ReturnType<typeof _get_hoyolab_teyvat_tree>>,
): number[] {
	const tree_ids = _tree_item_ids(tree);
	return [...counts.keys()].filter((id) => !tree_ids.has(id));
}

export async function _get_account_inventory(account: TeyvatAccount): Promise<TeyvatAccountInventory> {
	const client = _get_http_client(account.inst);
	const [raw, initial_tree] = await Promise.all([
		_get_hoyolab_genshin_inventory(client, account.uid, account.server),
		_get_hoyolab_teyvat_tree(client),
	]);

	try {
		const counts = _inventory_counts(raw.material_info);
		let tree = initial_tree;
		if (_missing_inventory_ids(counts, tree).length > 0) tree = await _get_hoyolab_teyvat_tree(client, true);
		const missing_ids = _missing_inventory_ids(counts, tree);
		if (missing_ids.length > 0)
			throw new TypeError(`Teyvat tree is missing ${missing_ids.length} owned inventory item identifiers`);

		return schema_teyvat_account_inventory.assert(
			tree
				.filter((category) => category.children.some((item) => item.item_id !== 0))
				.map((category) => ({
					id: category.id,
					name: category.name,
					items: category.children
						.filter((item) => item.item_id !== 0)
						.map((item) => ({
							id: item.id,
							item_id: item.item_id,
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
