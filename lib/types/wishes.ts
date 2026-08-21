import { type } from 'arktype';
import type { TeyvatPaginator } from './paginator.ts';
import type { TeyvatTransaction, TeyvatTransactionOptions, TeyvatTransactionType } from './transactions.ts';

const schema_banner_type = type.enumerated('novice', 'standard', 'character', 'weapon', 'chronicled');
/**
 * @useDeclaredType
 * @category Wish History
 */
export type TeyvatWishBannerType = typeof schema_banner_type.infer;

const schema_item_type = type.enumerated('character', 'weapon', 'unknown');
/**
 * @useDeclaredType
 * @category Wish History
 */
export type TeyvatWishItemType = typeof schema_item_type.infer;

/** @category Wish History */
export interface TeyvatWishesOptions {
	authkey: string;
}

/** @category Wish History */
export interface TeyvatWishHistoryOptions {
	type: TeyvatWishBannerType;
	limit?: number;
}

export const schema_teyvat_wish = type({
	id: 'string',
	uid: 'number.integer',
	server: type.enumerated('os_usa', 'os_euro', 'os_asia', 'os_cht'),
	name: 'string',
	item_type: schema_item_type,
	rarity: 'number.integer',
	banner_type: schema_banner_type,
	wished_at: 'Date',
});

/**
 * @interface
 * @useDeclaredType
 * @category Wish History
 */
export type TeyvatWish = typeof schema_teyvat_wish.infer;

/** @category Wish History */
export interface TeyvatWishClient {
	history(options: TeyvatWishHistoryOptions): TeyvatPaginator<TeyvatWish>;
	transactions<T extends TeyvatTransactionType>(
		options: TeyvatTransactionOptions<T>,
	): TeyvatPaginator<TeyvatTransaction & { type: T }>;
}
