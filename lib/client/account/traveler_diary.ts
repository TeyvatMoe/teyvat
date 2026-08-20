import {
	_get_hoyolab_genshin_traveler_diary,
	_get_hoyolab_genshin_traveler_diary_log_page,
} from '../../endpoints/hoyolab/genshin/traveler_diary.ts';
import {
	schema_teyvat_account_traveler_diary,
	schema_teyvat_traveler_diary_entry,
	type TeyvatAccountTravelerDiary,
	type TeyvatTravelerDiaryCurrency,
	type TeyvatTravelerDiaryEntry,
	type TeyvatTravelerDiaryLogOptions,
	type TeyvatTravelerDiaryOptions,
} from '../../types/account/traveler_diary.ts';
import type { TeyvatPaginator } from '../../types/paginator.ts';
import { _current_utc_offset_month, _hoyolab_datetime } from '../../utils/misc.ts';
import { TeyvatError, TeyvatResponseValidationError } from '../errors.ts';
import { _TeyvatPaginator } from '../paginator.ts';
import { _get_http_client } from '../request.ts';
import type { TeyvatAccount } from './index.ts';

const SUMMARY_ENDPOINT = '/event/ysledgeros/month_info';
const LOG_ENDPOINT = '/event/ysledgeros/month_detail';
const PAGE_SIZE = 100;

function _diary_month(value: unknown): number {
	const month = value ?? _current_utc_offset_month();
	if (!Number.isSafeInteger(month) || Number(month) < 1 || Number(month) > 12)
		throw new TeyvatError('Traveler Diary month must be an integer from 1 through 12');
	return Number(month);
}

function _diary_currency(value: unknown): TeyvatTravelerDiaryCurrency {
	if (value === undefined || value === 'primogems') return 'primogems';
	if (value === 'mora') return 'mora';
	throw new TeyvatError('Traveler Diary currency must be primogems or mora');
}

function _diary_limit(value: unknown): number | undefined {
	if (value === undefined) return undefined;
	if (!Number.isSafeInteger(value) || Number(value) < 0)
		throw new TeyvatError('Traveler Diary log limit must be a nonnegative safe integer');
	return Number(value);
}

function _validate_diary_metadata(
	account: TeyvatAccount,
	raw: { uid: number; region: string; data_month: number; optional_month: number[] },
	month: number,
): void {
	if (raw.uid !== account.uid) throw new TypeError(`uid must be ${account.uid}`);
	if (raw.region !== account.server) throw new TypeError(`region must be ${account.server}`);
	if (raw.data_month !== month) throw new TypeError(`data_month must be ${month}`);
	if (raw.optional_month.some((available_month) => available_month < 1 || available_month > 12))
		throw new TypeError('optional_month must contain months from 1 through 12');
}

export async function _get_account_traveler_diary(
	account: TeyvatAccount,
	options: TeyvatTravelerDiaryOptions = {},
): Promise<TeyvatAccountTravelerDiary> {
	const month = _diary_month(options.month);
	const raw = await _get_hoyolab_genshin_traveler_diary(
		_get_http_client(account.inst),
		account.uid,
		account.server,
		month,
	);

	try {
		_validate_diary_metadata(account, raw, month);
		return schema_teyvat_account_traveler_diary.assert({
			month: raw.data_month,
			available_months: raw.optional_month,
			primogems: {
				current_month: raw.month_data.current_primogems,
				previous_month: raw.month_data.last_primogems,
				change_percentage: raw.month_data.primogem_rate,
				today: raw.day_data.current_primogems,
				sources: raw.month_data.group_by.map((source) => ({
					id: source.action_id,
					name: source.action,
					amount: source.num,
					percentage: source.percent,
				})),
			},
			mora: {
				current_month: raw.month_data.current_mora,
				previous_month: raw.month_data.last_mora,
				change_percentage: raw.month_data.mora_rate,
				today: raw.day_data.current_mora,
			},
		});
	} catch (cause) {
		throw new TeyvatResponseValidationError('GET', SUMMARY_ENDPOINT, [String(cause)], { cause });
	}
}

export function _get_account_traveler_diary_log(
	account: TeyvatAccount,
	options: TeyvatTravelerDiaryLogOptions = {},
): TeyvatPaginator<TeyvatTravelerDiaryEntry> {
	const month = _diary_month(options.month);
	const currency = _diary_currency(options.currency);
	const limit = _diary_limit(options.limit);
	const client = _get_http_client(account.inst);

	return new _TeyvatPaginator({
		initial_cursor: 1,
		limit,
		get_page: async (page) => {
			const raw = await _get_hoyolab_genshin_traveler_diary_log_page(
				client,
				account.uid,
				account.server,
				month,
				currency === 'primogems' ? 1 : 2,
				page,
			);

			try {
				_validate_diary_metadata(account, raw, month);
				if (raw.current_page !== page) throw new TypeError(`current_page must be ${page}`);
				const items = raw.list.map((entry) =>
					schema_teyvat_traveler_diary_entry.assert({
						id: entry.action_id,
						name: entry.action,
						earned_at: _hoyolab_datetime(entry.time, 8, 'list.time'),
						amount: entry.num,
					}),
				);
				return { items, next_cursor: items.length < PAGE_SIZE ? null : page + 1 };
			} catch (cause) {
				throw new TeyvatResponseValidationError('GET', LOG_ENDPOINT, [String(cause)], { cause });
			}
		},
	});
}
