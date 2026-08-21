import { TeyvatError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _TeyvatPaginator } from '#/client/paginator.ts';
import { _getHttpClient } from '#/client/request.ts';
import {
	_getHoyolabGenshinTravelerDiary,
	_getHoyolabGenshinTravelerDiaryLogPage,
} from '#/endpoints/hoyolab/genshin/traveler_diary.ts';
import {
	schemaTeyvatAccountTravelerDiary,
	schemaTeyvatTravelerDiaryEntry,
	type TeyvatAccountTravelerDiary,
	type TeyvatTravelerDiaryCurrency,
	type TeyvatTravelerDiaryEntry,
	type TeyvatTravelerDiaryLogOptions,
	type TeyvatTravelerDiaryOptions,
} from '#/types/account/traveler_diary.ts';
import type { TeyvatPaginator } from '#/types/paginator.ts';
import { _currentUtcOffsetMonth, _hoyolabDatetime } from '#/utils/misc.ts';
import type { TeyvatAccount } from './index.ts';

const SUMMARY_ENDPOINT = '/event/ysledgeros/month_info';
const LOG_ENDPOINT = '/event/ysledgeros/month_detail';
const PAGE_SIZE = 100;

function _diaryMonth(value: unknown): number {
	const month = value ?? _currentUtcOffsetMonth();
	if (!Number.isSafeInteger(month) || Number(month) < 1 || Number(month) > 12)
		throw new TeyvatError('Traveler Diary month must be an integer from 1 through 12');
	return Number(month);
}

function _diaryCurrency(value: unknown): TeyvatTravelerDiaryCurrency {
	if (value === undefined || value === 'primogems') return 'primogems';
	if (value === 'mora') return 'mora';
	throw new TeyvatError('Traveler Diary currency must be primogems or mora');
}

function _diaryLimit(value: unknown): number | undefined {
	if (value === undefined) return undefined;
	if (!Number.isSafeInteger(value) || Number(value) < 0)
		throw new TeyvatError('Traveler Diary log limit must be a nonnegative safe integer');
	return Number(value);
}

function _validateDiaryMetadata(
	account: TeyvatAccount,
	raw: { uid: number; region: string; ['data_month']: number; ['optional_month']: number[] },
	month: number,
): void {
	if (raw.uid !== account.uid) throw new TypeError(`uid must be ${account.uid}`);
	if (raw.region !== account.server) throw new TypeError(`region must be ${account.server}`);
	if (raw.data_month !== month) throw new TypeError(`data_month must be ${month}`);
	if (raw.optional_month.some((availableMonth) => availableMonth < 1 || availableMonth > 12))
		throw new TypeError('optional_month must contain months from 1 through 12');
}

export async function _getAccountTravelerDiary(
	account: TeyvatAccount,
	options: TeyvatTravelerDiaryOptions = {},
): Promise<TeyvatAccountTravelerDiary> {
	const month = _diaryMonth(options.month);
	const raw = await _getHoyolabGenshinTravelerDiary(_getHttpClient(account.inst), account.uid, account.server, month);

	try {
		_validateDiaryMetadata(account, raw, month);
		return schemaTeyvatAccountTravelerDiary.assert({
			month: raw.data_month,
			availableMonths: raw.optional_month,
			primogems: {
				currentMonth: raw.month_data.current_primogems,
				previousMonth: raw.month_data.last_primogems,
				changePercentage: raw.month_data.primogem_rate,
				today: raw.day_data.current_primogems,
				sources: raw.month_data.group_by.map((source) => ({
					id: source.action_id,
					name: source.action,
					amount: source.num,
					percentage: source.percent,
				})),
			},
			mora: {
				currentMonth: raw.month_data.current_mora,
				previousMonth: raw.month_data.last_mora,
				changePercentage: raw.month_data.mora_rate,
				today: raw.day_data.current_mora,
			},
		});
	} catch (cause) {
		throw new TeyvatResponseValidationError('GET', SUMMARY_ENDPOINT, [String(cause)], { cause });
	}
}

export function _getAccountTravelerDiaryLog(
	account: TeyvatAccount,
	options: TeyvatTravelerDiaryLogOptions = {},
): TeyvatPaginator<TeyvatTravelerDiaryEntry> {
	const month = _diaryMonth(options.month);
	const currency = _diaryCurrency(options.currency);
	const limit = _diaryLimit(options.limit);
	const client = _getHttpClient(account.inst);

	return new _TeyvatPaginator({
		initialCursor: 1,
		limit,
		getPage: async (page) => {
			const raw = await _getHoyolabGenshinTravelerDiaryLogPage(
				client,
				account.uid,
				account.server,
				month,
				currency === 'primogems' ? 1 : 2,
				page,
			);

			try {
				_validateDiaryMetadata(account, raw, month);
				if (raw.current_page !== page) throw new TypeError(`current_page must be ${page}`);
				const items = raw.list.map((entry) =>
					schemaTeyvatTravelerDiaryEntry.assert({
						id: entry.action_id,
						name: entry.action,
						earnedAt: _hoyolabDatetime(entry.time, 8, 'list.time'),
						amount: entry.num,
					}),
				);
				return { items, nextCursor: items.length < PAGE_SIZE ? null : page + 1 };
			} catch (cause) {
				throw new TeyvatResponseValidationError('GET', LOG_ENDPOINT, [String(cause)], { cause });
			}
		},
	});
}
