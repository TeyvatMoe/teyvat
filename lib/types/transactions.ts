import { type } from 'arktype';

const schema_currency_type = type.enumerated('primogem', 'crystal', 'resin');
/**
 * @useDeclaredType
 * @category Transaction History
 */
export type TeyvatCurrencyTransactionType = typeof schema_currency_type.infer;

const schema_item_type = type.enumerated('artifact', 'weapon');
/**
 * @useDeclaredType
 * @category Transaction History
 */
export type TeyvatItemTransactionType = typeof schema_item_type.infer;

const schema_transaction_type = schema_currency_type.or(schema_item_type);
/**
 * @useDeclaredType
 * @category Transaction History
 */
export type TeyvatTransactionType = typeof schema_transaction_type.infer;

/** @category Transaction History */
export interface TeyvatTransactionOptions<T extends TeyvatTransactionType = TeyvatTransactionType> {
	type: T;
	limit?: number;
}

export const schema_teyvat_currency_transaction = type({
	id: 'string',
	type: schema_currency_type,
	amount: 'number.integer',
	reason: 'string',
	transacted_at: 'Date',
});

export const schema_teyvat_item_transaction = type({
	id: 'string',
	type: schema_item_type,
	amount: 'number.integer',
	reason: 'string',
	transacted_at: 'Date',
	item: {
		name: 'string',
		rarity: 'number.integer',
	},
});

const schema_teyvat_transaction = schema_teyvat_currency_transaction.or(schema_teyvat_item_transaction);

/**
 * @useDeclaredType
 * @category Transaction History
 */
export type TeyvatTransaction = typeof schema_teyvat_transaction.infer;
