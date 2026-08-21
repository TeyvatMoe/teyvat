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

type RawWish = Awaited<ReturnType<typeof _getHoyolabGenshinWishes>>['list'][number];
type RawCurrencyTransaction = Awaited<ReturnType<typeof _getHoyolabGenshinCurrencyTransactions>>['list'][number];
type RawItemTransaction = Awaited<ReturnType<typeof _getHoyolabGenshinItemTransactions>>['list'][number];

interface WishPageState {
	uid?: number;
	server?: TeyvatServer;
}

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

function _safeRequestError(cause: unknown): never {
	if (cause instanceof TeyvatRequestError)
		throw new TeyvatRequestError(cause.kind, cause.method, cause.endpoint, cause.message, { status: cause.status });
	throw cause;
}

function _wish(raw: RawWish, server: TeyvatServer, bannerType: TeyvatWishBannerType): TeyvatWish {
	const uid = _positiveInteger(raw.uid, 'wish.uid');
	if (_recognizeGenshinServer(uid) !== server)
		throw new TypeError('wish.uid does not agree with the returned region');
	return schemaTeyvatWish.assert({
		id: _integerString(raw.id, 'wish.id'),
		uid,
		server,
		name: raw.name,
		itemType: _itemType(raw.item_type),
		rarity: _positiveInteger(raw.rank_type, 'wish.rank_type'),
		bannerType,
		wishedAt: _hoyolabDatetime(raw.time, server === 'os_usa' ? -5 : server === 'os_euro' ? 1 : 8, 'wish.time'),
	});
}

function _currencyTransaction(raw: RawCurrencyTransaction, type: 'primogem' | 'crystal' | 'resin'): TeyvatTransaction {
	return schemaTeyvatCurrencyTransaction.assert({
		id: _integerString(raw.id, 'transaction.id'),
		type,
		amount: _signedInteger(raw.add_num, 'transaction.add_num'),
		reason: raw.reason,
		transactedAt: _hoyolabDatetime(raw.datetime, 8, 'transaction.datetime'),
	});
}

function _itemTransaction(raw: RawItemTransaction, type: 'artifact' | 'weapon'): TeyvatTransaction {
	return schemaTeyvatItemTransaction.assert({
		id: _integerString(raw.id, 'transaction.id'),
		type,
		amount: _signedInteger(raw.add_num, 'transaction.add_num'),
		reason: raw.reason,
		transactedAt: _hoyolabDatetime(raw.datetime, 8, 'transaction.datetime'),
		item: { name: raw.name, rarity: _positiveInteger(raw.quality, 'transaction.quality') },
	});
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

		const state: WishPageState = {};
		return new _TeyvatPaginator<TeyvatWish, string>({
			initialCursor: '0',
			limit: options.limit,
			getPage: (endId) => this.#wishPage(options.type, bannerType, endId, state),
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
			getPage: (endId) => this.#transactionsPage(options.type, endId),
		});
		return paginator as _TeyvatPaginator<TeyvatTransaction & { type: T }, string>;
	}

	async #wishPage(type: TeyvatWishBannerType, bannerType: number, endId: string, state: WishPageState) {
		let raw: Awaited<ReturnType<typeof _getHoyolabGenshinWishes>>;
		try {
			raw = await _getHoyolabGenshinWishes(this.#client, this.#authkey, bannerType, endId);
		} catch (cause) {
			_safeRequestError(cause);
		}
		try {
			const server = _server(raw.region);
			if (state.server !== undefined && server !== state.server)
				throw new TypeError('region changed between wish-history pages');
			const items = raw.list.map((item) => _wish(item, server, type));
			const pageUid = items[0]?.uid;
			if (items.some((item) => item.uid !== pageUid))
				throw new TypeError('uid changed within a wish-history page');
			if (state.uid !== undefined && pageUid !== undefined && pageUid !== state.uid)
				throw new TypeError('uid changed between wish-history pages');
			if (pageUid !== undefined) {
				state.uid ??= pageUid;
				state.server ??= server;
			}
			const lastId = items.at(-1)?.id;
			if (items.length === PAGE_SIZE && lastId === endId)
				throw new TypeError('wish-history cursor did not advance');
			return { items, nextCursor: items.length < PAGE_SIZE ? null : (lastId ?? null) };
		} catch (cause) {
			throw new TeyvatResponseValidationError('GET', ENDPOINT, [String(cause)], { cause });
		}
	}

	async #transactionsPage(type: TeyvatTransactionType, endId: string) {
		try {
			const items =
				type === 'artifact' || type === 'weapon'
					? await this.#itemTransactions(type, endId)
					: await this.#currencyTransactions(type, endId);
			return this.#transactionPage(items, endId);
		} catch (cause) {
			if (cause instanceof TeyvatRequestError) _safeRequestError(cause);
			if (cause instanceof TeyvatResponseValidationError) throw cause;
			throw new TeyvatResponseValidationError('GET', TRANSACTION_ENDPOINT, [String(cause)], { cause });
		}
	}

	async #itemTransactions(type: 'artifact' | 'weapon', endId: string): Promise<TeyvatTransaction[]> {
		const raw = await _getHoyolabGenshinItemTransactions(this.#client, { authkey: this.#authkey, type, endId });
		return raw.list.map((item) => _itemTransaction(item, type));
	}

	async #currencyTransactions(type: 'primogem' | 'crystal' | 'resin', endId: string): Promise<TeyvatTransaction[]> {
		const raw = await _getHoyolabGenshinCurrencyTransactions(this.#client, { authkey: this.#authkey, type, endId });
		return raw.list.map((item) => _currencyTransaction(item, type));
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
