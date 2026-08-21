import { type } from 'arktype';
import type { TeyvatLanguage } from './language.ts';
import type { TeyvatPaginator } from './paginator.ts';
import type { TeyvatTransaction, TeyvatTransactionOptions, TeyvatTransactionType } from './transactions.ts';

const schemaBannerType = type.enumerated('novice', 'standard', 'character', 'weapon', 'chronicled');
/**
 * @useDeclaredType
 * @category Wish History
 */
export type TeyvatWishBannerType = typeof schemaBannerType.infer;

const schemaItemType = type.enumerated('character', 'weapon', 'unknown');
/**
 * @useDeclaredType
 * @category Wish History
 */
export type TeyvatWishItemType = typeof schemaItemType.infer;

/** @category Wish History */
export interface TeyvatWishesOptions {
	authkey: string;
	language?: TeyvatLanguage;
}

/** @category Wish History */
export interface TeyvatWishHistoryOptions {
	type: TeyvatWishBannerType;
	limit?: number;
}

export const schemaTeyvatWish = type({
	id: 'string',
	uid: 'number.integer',
	server: type.enumerated('os_usa', 'os_euro', 'os_asia', 'os_cht'),
	name: 'string',
	itemType: schemaItemType,
	rarity: 'number.integer',
	bannerType: schemaBannerType,
	wishedAt: 'Date',
});

/**
 * @interface
 * @useDeclaredType
 * @category Wish History
 */
export type TeyvatWish = typeof schemaTeyvatWish.infer;

/** @category Wish History */
export interface TeyvatWishClient {
	readonly language: TeyvatLanguage;
	history(options: TeyvatWishHistoryOptions): TeyvatPaginator<TeyvatWish>;
	transactions<T extends TeyvatTransactionType>(
		options: TeyvatTransactionOptions<T>,
	): TeyvatPaginator<TeyvatTransaction & { type: T }>;
}
