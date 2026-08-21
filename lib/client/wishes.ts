import {
	_getHoyolabGenshinCurrencyTransactions,
	_getHoyolabGenshinItemTransactions,
} from '#/endpoints/hoyolab/genshin/transactions.ts';
import { _getHoyolabGenshinWishes } from '#/endpoints/hoyolab/genshin/wishes.ts';
import type { TeyvatServer } from '#/types/account/server.ts';
import type { TeyvatLanguage } from '#/types/language.ts';
import {
	schemaTeyvatCurrencyTransaction,
	schemaTeyvatItemTransaction,
	type TeyvatTransaction,
	type TeyvatTransactionOptions,
	type TeyvatTransactionType,
} from '#/types/transactions.ts';
import {
	schemaTeyvatWish,
	type TeyvatWish,
	type TeyvatWishBannerType,
	type TeyvatWishClient,
	type TeyvatWishesOptions,
	type TeyvatWishHistoryOptions,
	type TeyvatWishItemType,
} from '#/types/wishes.ts';
import { _hoyolabDatetime } from '#/utils/misc.ts';
import { _recognizeGenshinServer } from '#/utils/uid.ts';
import { TeyvatError, TeyvatRequestError, TeyvatResponseValidationError } from './errors.ts';
import { _TeyvatPaginator } from './paginator.ts';
import { TeyvatHttpClient } from './request.ts';

const ENDPOINT = '/gacha_info/api/getGachaLog';
const TRANSACTION_ENDPOINT = '/common/hk4e_self_help_query/User';
const PAGE_SIZE = 20;

const BANNER_TYPES: Record<TeyvatWishBannerType, number> = {
	novice: 100,
	standard: 200,
	character: 301,
	weapon: 302,
	chronicled: 500,
};

function _normalizeAuthkey(value: string): string {
	let authkey: string;
	try {
		authkey = decodeURIComponent(value).trim();
	} catch {
		throw new TeyvatError('authkey must be a valid percent-encoded or unencoded authkey');
	}

	if (!authkey || authkey.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(authkey))
		throw new TeyvatError('authkey must be a valid base64-encoded string');
	return authkey;
}

function _positiveInteger(value: string, field: string): number {
	if (!/^\d+$/.test(value)) throw new TypeError(`${field} must be a positive integer`);
	const number = Number(value);
	if (!Number.isSafeInteger(number) || number <= 0) throw new TypeError(`${field} must be a positive safe integer`);
	return number;
}

function _signedInteger(value: string, field: string): number {
	if (!/^-?\d+$/.test(value)) throw new TypeError(`${field} must be an integer`);
	const number = Number(value);
	if (!Number.isSafeInteger(number)) throw new TypeError(`${field} must be a safe integer`);
	return number;
}

function _integerString(value: string, field: string): string {
	if (!/^[1-9]\d*$/.test(value)) throw new TypeError(`${field} must be a positive integer string`);
	return value;
}

function _server(value: string): TeyvatServer {
	if (value === 'os_usa' || value === 'os_euro' || value === 'os_asia' || value === 'os_cht') return value;
	throw new TypeError('region must be a supported overseas Genshin server');
}

function _itemType(value: string): TeyvatWishItemType {
	const normalized = value.toLowerCase();
	if (normalized === 'character') return 'character';
	if (normalized === 'weapon') return 'weapon';
	return 'unknown';
}

export class _TeyvatWishClient implements TeyvatWishClient {
	readonly #authkey: string;
	readonly #client: TeyvatHttpClient;
	readonly language: TeyvatLanguage;

	constructor(options: TeyvatWishesOptions) {
		if (!options || typeof options.authkey !== 'string') throw new TeyvatError('authkey must be a string');
		this.#authkey = _normalizeAuthkey(options.authkey);
		this.#client = new TeyvatHttpClient({}, { language: options.language });
		this.language = this.#client.language;
	}

	history(options: TeyvatWishHistoryOptions): _TeyvatPaginator<TeyvatWish, string> {
		if (!options || typeof options.type !== 'string')
			throw new TeyvatError('type must be a supported Genshin wish banner');
		const bannerType = BANNER_TYPES[options.type];
		if (bannerType === undefined) throw new TeyvatError('type must be a supported Genshin wish banner');
		if (options.limit !== undefined && (!Number.isSafeInteger(options.limit) || options.limit < 0))
			throw new TeyvatError('limit must be a nonnegative safe integer');

		let expectedUid: number | undefined;
		let expectedServer: TeyvatServer | undefined;
		return new _TeyvatPaginator<TeyvatWish, string>({
			initialCursor: '0',
			limit: options.limit,
			getPage: async (endId) => {
				let raw: Awaited<ReturnType<typeof _getHoyolabGenshinWishes>>;
				try {
					raw = await _getHoyolabGenshinWishes(this.#client, this.#authkey, bannerType, endId);
				} catch (cause) {
					if (cause instanceof TeyvatRequestError)
						throw new TeyvatRequestError(cause.kind, cause.method, cause.endpoint, cause.message, {
							status: cause.status,
						});
					throw cause;
				}
				try {
					const server = _server(raw.region);
					if (expectedServer !== undefined && server !== expectedServer)
						throw new TypeError('region changed between wish-history pages');

					let pageUid: number | undefined;
					const items = raw.list.map((wish) => {
						const uid = _positiveInteger(wish.uid, 'wish.uid');
						if (_recognizeGenshinServer(uid) !== server)
							throw new TypeError('wish.uid does not agree with the returned region');
						if (expectedUid !== undefined && uid !== expectedUid)
							throw new TypeError('uid changed between wish-history pages');
						if (pageUid !== undefined && uid !== pageUid)
							throw new TypeError('uid changed within a wish-history page');
						pageUid ??= uid;

						return schemaTeyvatWish.assert({
							id: _integerString(wish.id, 'wish.id'),
							uid,
							server,
							name: wish.name,
							itemType: _itemType(wish.item_type),
							rarity: _positiveInteger(wish.rank_type, 'wish.rank_type'),
							bannerType: options.type,
							wishedAt: _hoyolabDatetime(
								wish.time,
								server === 'os_usa' ? -5 : server === 'os_euro' ? 1 : 8,
								'wish.time',
							),
						});
					});

					if (items[0]) {
						expectedUid ??= pageUid;
						expectedServer ??= server;
					}
					const lastId = items.at(-1)?.id;
					if (items.length === PAGE_SIZE && lastId === endId)
						throw new TypeError('wish-history cursor did not advance');

					return {
						items,
						nextCursor: items.length < PAGE_SIZE ? null : (lastId ?? null),
					};
				} catch (cause) {
					throw new TeyvatResponseValidationError('GET', ENDPOINT, [String(cause)], { cause });
				}
			},
		});
	}

	transactions<T extends TeyvatTransactionType>(
		options: TeyvatTransactionOptions<T>,
	): _TeyvatPaginator<TeyvatTransaction & { type: T }, string> {
		if (!options || typeof options.type !== 'string')
			throw new TeyvatError('type must be a supported Genshin transaction type');
		const _itemType = options.type === 'artifact' || options.type === 'weapon';
		if (!_itemType && options.type !== 'primogem' && options.type !== 'crystal' && options.type !== 'resin')
			throw new TeyvatError('type must be a supported Genshin transaction type');
		if (options.limit !== undefined && (!Number.isSafeInteger(options.limit) || options.limit < 0))
			throw new TeyvatError('limit must be a nonnegative safe integer');

		const paginator = new _TeyvatPaginator<TeyvatTransaction, string>({
			initialCursor: '0',
			limit: options.limit,
			getPage: async (endId) => {
				try {
					if (_itemType) {
						const raw = await _getHoyolabGenshinItemTransactions(this.#client, {
							authkey: this.#authkey,
							type: options.type,
							endId: endId,
						});
						const items = raw.list.map((transaction) =>
							schemaTeyvatItemTransaction.assert({
								id: _integerString(transaction.id, 'transaction.id'),
								type: options.type,
								amount: _signedInteger(transaction.add_num, 'transaction.add_num'),
								reason: transaction.reason,
								transactedAt: _hoyolabDatetime(transaction.datetime, 8, 'transaction.datetime'),
								item: {
									name: transaction.name,
									rarity: _positiveInteger(transaction.quality, 'transaction.quality'),
								},
							}),
						);
						return this.#transactionPage(items, endId);
					}

					const raw = await _getHoyolabGenshinCurrencyTransactions(this.#client, {
						authkey: this.#authkey,
						type: options.type,
						endId: endId,
					});
					const items = raw.list.map((transaction) =>
						schemaTeyvatCurrencyTransaction.assert({
							id: _integerString(transaction.id, 'transaction.id'),
							type: options.type,
							amount: _signedInteger(transaction.add_num, 'transaction.add_num'),
							reason: transaction.reason,
							transactedAt: _hoyolabDatetime(transaction.datetime, 8, 'transaction.datetime'),
						}),
					);
					return this.#transactionPage(items, endId);
				} catch (cause) {
					if (cause instanceof TeyvatRequestError)
						throw new TeyvatRequestError(cause.kind, cause.method, cause.endpoint, cause.message, {
							status: cause.status,
						});
					if (cause instanceof TeyvatResponseValidationError) throw cause;
					throw new TeyvatResponseValidationError('GET', TRANSACTION_ENDPOINT, [String(cause)], { cause });
				}
			},
		});
		return paginator as _TeyvatPaginator<TeyvatTransaction & { type: T }, string>;
	}

	#transactionPage<T extends TeyvatTransaction>(items: T[], endId: string) {
		const lastId = items.at(-1)?.id;
		if (items.length === PAGE_SIZE && lastId === endId)
			throw new TypeError('transaction-history cursor did not advance');
		return {
			items,
			nextCursor: items.length < PAGE_SIZE ? null : (lastId ?? null),
		};
	}
}
