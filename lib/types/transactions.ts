import { type } from 'arktype';

const schemaCurrencyType = type.enumerated('primogem', 'crystal', 'resin');
/**
 * @useDeclaredType
 * @category Transaction History
 */
export type TeyvatCurrencyTransactionType = typeof schemaCurrencyType.infer;

const schemaItemType = type.enumerated('artifact', 'weapon');
/**
 * @useDeclaredType
 * @category Transaction History
 */
export type TeyvatItemTransactionType = typeof schemaItemType.infer;

const schemaTransactionType = schemaCurrencyType.or(schemaItemType);
/**
 * @useDeclaredType
 * @category Transaction History
 */
export type TeyvatTransactionType = typeof schemaTransactionType.infer;

/** @category Transaction History */
export interface TeyvatTransactionOptions<T extends TeyvatTransactionType = TeyvatTransactionType> {
	type: T;
	limit?: number;
}

export const schemaTeyvatCurrencyTransaction = type({
	id: 'string',
	type: schemaCurrencyType,
	amount: 'number.integer',
	reason: 'string',
	transactedAt: 'Date',
});

export const schemaTeyvatItemTransaction = type({
	id: 'string',
	type: schemaItemType,
	amount: 'number.integer',
	reason: 'string',
	transactedAt: 'Date',
	item: {
		name: 'string',
		rarity: 'number.integer',
	},
});

const schemaTeyvatTransaction = schemaTeyvatCurrencyTransaction.or(schemaTeyvatItemTransaction);

/**
 * @useDeclaredType
 * @category Transaction History
 */
export type TeyvatTransaction = typeof schemaTeyvatTransaction.infer;
