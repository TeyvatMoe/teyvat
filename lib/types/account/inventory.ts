import { type } from 'arktype';

const schemaInventoryItem = type({
	id: 'number.integer >= 0',
	itemId: 'number.integer > 0',
	name: 'string',
	icon: 'string',
	count: 'number.integer >= 0',
});

export const schemaTeyvatAccountInventory = type({
	id: 'number.integer >= 0',
	name: 'string',
	items: schemaInventoryItem.array(),
}).array();

/**
 * @useDeclaredType
 * @category Inventory
 */
export type TeyvatAccountInventory = typeof schemaTeyvatAccountInventory.infer;
