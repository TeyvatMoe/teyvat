import { type } from 'arktype';

const schema_inventory_item = type({
	id: 'number.integer >= 0',
	item_id: 'number.integer > 0',
	name: 'string',
	icon: 'string',
	count: 'number.integer >= 0',
});

export const schema_teyvat_account_inventory = type({
	id: 'number.integer >= 0',
	name: 'string',
	items: schema_inventory_item.array(),
}).array();

/**
 * @useDeclaredType
 * @category Inventory
 */
export type TeyvatAccountInventory = typeof schema_teyvat_account_inventory.infer;
