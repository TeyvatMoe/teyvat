import { _get_hoyolab_genshin_wishes } from '../endpoints/hoyolab/genshin/wishes.ts';
import type { TeyvatServer } from '../types/account/server.ts';
import {
	schema_teyvat_wish,
	type TeyvatWish,
	type TeyvatWishBannerType,
	type TeyvatWishClient,
	type TeyvatWishHistoryOptions,
	type TeyvatWishItemType,
	type TeyvatWishesOptions,
} from '../types/wishes.ts';
import { _hoyolab_datetime } from '../utils/misc.ts';
import { _recognize_genshin_server } from '../utils/uid.ts';
import { TeyvatError, TeyvatRequestError, TeyvatResponseValidationError } from './errors.ts';
import { _TeyvatPaginator } from './paginator.ts';
import { TeyvatHttpClient } from './request.ts';

const ENDPOINT = '/gacha_info/api/getGachaLog';
const PAGE_SIZE = 20;

const BANNER_TYPES: Record<TeyvatWishBannerType, number> = {
	novice: 100,
	standard: 200,
	character: 301,
	weapon: 302,
	chronicled: 500,
};

function _normalize_authkey(value: string): string {
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

function _positive_integer(value: string, field: string): number {
	if (!/^\d+$/.test(value)) throw new TypeError(`${field} must be a positive integer`);
	const number = Number(value);
	if (!Number.isSafeInteger(number) || number <= 0) throw new TypeError(`${field} must be a positive safe integer`);
	return number;
}

function _integer_string(value: string, field: string): string {
	if (!/^[1-9]\d*$/.test(value)) throw new TypeError(`${field} must be a positive integer string`);
	return value;
}

function _server(value: string): TeyvatServer {
	if (value === 'os_usa' || value === 'os_euro' || value === 'os_asia' || value === 'os_cht') return value;
	throw new TypeError('region must be a supported overseas Genshin server');
}

function _item_type(value: string): TeyvatWishItemType {
	const normalized = value.toLowerCase();
	if (normalized === 'character') return 'character';
	if (normalized === 'weapon') return 'weapon';
	return 'unknown';
}

export class _TeyvatWishClient implements TeyvatWishClient {
	readonly #authkey: string;
	readonly #client = new TeyvatHttpClient({});

	constructor(options: TeyvatWishesOptions) {
		if (!options || typeof options.authkey !== 'string') throw new TeyvatError('authkey must be a string');
		this.#authkey = _normalize_authkey(options.authkey);
	}

	history(options: TeyvatWishHistoryOptions): _TeyvatPaginator<TeyvatWish, string> {
		if (!options || typeof options.type !== 'string')
			throw new TeyvatError('type must be a supported Genshin wish banner');
		const banner_type = BANNER_TYPES[options.type];
		if (banner_type === undefined) throw new TeyvatError('type must be a supported Genshin wish banner');
		if (
			options.limit !== undefined &&
			(!Number.isSafeInteger(options.limit) || options.limit < 0)
		)
			throw new TeyvatError('limit must be a nonnegative safe integer');

		let expected_uid: number | undefined;
		let expected_server: TeyvatServer | undefined;
		return new _TeyvatPaginator<TeyvatWish, string>({
			initial_cursor: '0',
			limit: options.limit,
			get_page: async (end_id) => {
				let raw: Awaited<ReturnType<typeof _get_hoyolab_genshin_wishes>>;
				try {
					raw = await _get_hoyolab_genshin_wishes(this.#client, this.#authkey, banner_type, end_id);
				} catch (cause) {
					if (cause instanceof TeyvatRequestError)
						throw new TeyvatRequestError(cause.kind, cause.method, cause.endpoint, cause.message, {
							status: cause.status,
						});
					throw cause;
				}
				try {
					const server = _server(raw.region);
					if (expected_server !== undefined && server !== expected_server)
						throw new TypeError('region changed between wish-history pages');

					let page_uid: number | undefined;
					const items = raw.list.map((wish) => {
						const uid = _positive_integer(wish.uid, 'wish.uid');
						if (_recognize_genshin_server(uid) !== server)
							throw new TypeError('wish.uid does not agree with the returned region');
						if (expected_uid !== undefined && uid !== expected_uid)
							throw new TypeError('uid changed between wish-history pages');
						if (page_uid !== undefined && uid !== page_uid)
							throw new TypeError('uid changed within a wish-history page');
						page_uid ??= uid;

						return schema_teyvat_wish.assert({
							id: _integer_string(wish.id, 'wish.id'),
							uid,
							server,
							name: wish.name,
							item_type: _item_type(wish.item_type),
							rarity: _positive_integer(wish.rank_type, 'wish.rank_type'),
							banner_type: options.type,
							wished_at: _hoyolab_datetime(
								wish.time,
								server === 'os_usa' ? -5 : server === 'os_euro' ? 1 : 8,
								'wish.time',
							),
						});
					});

					if (items[0]) {
						expected_uid ??= page_uid;
						expected_server ??= server;
					}
					const last_id = items.at(-1)?.id;
					if (items.length === PAGE_SIZE && last_id === end_id)
						throw new TypeError('wish-history cursor did not advance');

					return {
						items,
						next_cursor: items.length < PAGE_SIZE ? null : (last_id ?? null),
					};
				} catch (cause) {
					throw new TeyvatResponseValidationError('GET', ENDPOINT, [String(cause)], { cause });
				}
			},
		});
	}
}
