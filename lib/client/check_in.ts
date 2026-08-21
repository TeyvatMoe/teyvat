import {
	_claim_hoyolab_check_in,
	_get_hoyolab_check_in_history_page,
	_get_hoyolab_check_in_info,
	_get_hoyolab_check_in_rewards,
	type HoyolabCheckInCaptcha,
} from '../endpoints/hoyolab/genshin/check_in.ts';
import {
	schema_teyvat_check_in_captcha_solution,
	schema_teyvat_check_in_history_entry,
	schema_teyvat_check_in_info,
	schema_teyvat_check_in_result,
	type TeyvatCheckInCaptchaSolution,
	type TeyvatCheckInClaimOptions,
	type TeyvatCheckInClient,
	type TeyvatCheckInHistoryEntry,
	type TeyvatCheckInHistoryOptions,
	type TeyvatCheckInInfo,
	type TeyvatCheckInResult,
} from '../types/check_in.ts';
import type { TeyvatPaginator } from '../types/paginator.ts';
import { _current_utc_offset_day, _hoyolab_datetime } from '../utils/misc.ts';
import { TeyvatError, TeyvatResponseValidationError } from './errors.ts';
import { _TeyvatPaginator } from './paginator.ts';
import { _get_http_client, type TeyvatHttpClient } from './request.ts';

const INFO_ENDPOINT = '/event/sol/info';
const CLAIM_ENDPOINT = '/event/sol/sign';
const HISTORY_ENDPOINT = '/event/sol/award';
const PAGE_SIZE = 10;

function _mapping_error(method: string, endpoint: string, cause: unknown): TeyvatResponseValidationError {
	return new TeyvatResponseValidationError(
		method,
		endpoint,
		[cause instanceof Error ? cause.message : String(cause)],
		{
			cause,
		},
	);
}

function _limit(value: unknown): number | undefined {
	if (value === undefined) return undefined;
	if (!Number.isSafeInteger(value) || Number(value) < 0)
		throw new TeyvatError('Daily check-in history limit must be a nonnegative safe integer');
	return Number(value);
}

export class _TeyvatCheckInClient implements TeyvatCheckInClient {
	readonly #client: TeyvatHttpClient;
	#pending_captcha?: HoyolabCheckInCaptcha;
	#operation: Promise<void> = Promise.resolve();

	constructor(owner: object) {
		this.#client = _get_http_client(owner);
	}

	async info(): Promise<TeyvatCheckInInfo> {
		const [status, calendar] = await Promise.all([
			_get_hoyolab_check_in_info(this.#client),
			_get_hoyolab_check_in_rewards(this.#client),
		]);
		try {
			return schema_teyvat_check_in_info.assert({
				signed_in: status.is_sign,
				claimed_days: status.total_sign_day,
				missed_days: Math.max(0, _current_utc_offset_day() - status.total_sign_day),
				rewards: calendar.awards.map((reward) => ({
					name: reward.name,
					amount: reward.cnt,
					icon: reward.icon,
				})),
			});
		} catch (cause) {
			throw _mapping_error('GET', INFO_ENDPOINT, cause);
		}
	}

	claim(options: TeyvatCheckInClaimOptions = {}): Promise<TeyvatCheckInResult> {
		const result = this.#operation.then(async () => await this.#claim(options));
		this.#operation = result.then(
			() => undefined,
			() => undefined,
		);
		return result;
	}

	history(options: TeyvatCheckInHistoryOptions = {}): TeyvatPaginator<TeyvatCheckInHistoryEntry> {
		const limit = _limit(options.limit);
		return new _TeyvatPaginator({
			initial_cursor: 1,
			limit,
			get_page: async (page) => {
				const raw = await _get_hoyolab_check_in_history_page(this.#client, page);
				try {
					const items = raw.list.map((entry) =>
						schema_teyvat_check_in_history_entry.assert({
							id: entry.id,
							name: entry.name,
							amount: entry.cnt,
							icon: entry.img,
							claimed_at: _hoyolab_datetime(entry.created_at, 8, 'created_at'),
						}),
					);
					return { items, next_cursor: items.length < PAGE_SIZE ? null : page + 1 };
				} catch (cause) {
					throw _mapping_error('GET', HISTORY_ENDPOINT, cause);
				}
			},
		});
	}

	async #claim(options: TeyvatCheckInClaimOptions): Promise<TeyvatCheckInResult> {
		const solution = this.#solution(options.captcha_solution);
		const status = await _get_hoyolab_check_in_info(this.#client);
		if (status.is_sign) {
			this.#pending_captcha = undefined;
			return await this.#claimed_result('already_claimed', status.total_sign_day);
		}
		if (this.#pending_captcha && !solution) return this.#captcha_result(this.#pending_captcha);

		const result = await _claim_hoyolab_check_in(this.#client, solution);
		if (result.status === 'captcha_required') {
			this.#pending_captcha = result.captcha;
			return this.#captcha_result(result.captcha);
		}

		this.#pending_captcha = undefined;
		const updated = await _get_hoyolab_check_in_info(this.#client);
		if (!updated.is_sign) {
			throw new TeyvatResponseValidationError('POST', CLAIM_ENDPOINT, [
				'daily check-in was not marked as claimed after a successful response',
			]);
		}
		return await this.#claimed_result(result.status, updated.total_sign_day);
	}

	#solution(value: unknown): TeyvatCheckInCaptchaSolution | undefined {
		if (value === undefined) return undefined;
		if (!this.#pending_captcha) throw new TeyvatError('Daily check-in is not awaiting a captcha solution');
		let solution: TeyvatCheckInCaptchaSolution;
		try {
			solution = schema_teyvat_check_in_captcha_solution.assert(value);
		} catch {
			throw new TeyvatError('Invalid daily check-in captcha solution');
		}
		if (solution.geetest_challenge !== this.#pending_captcha.challenge)
			throw new TeyvatError('Captcha solution does not match the pending daily check-in challenge');
		return solution;
	}

	#captcha_result(captcha: HoyolabCheckInCaptcha): TeyvatCheckInResult {
		return schema_teyvat_check_in_result.assert({
			status: 'captcha_required',
			captcha: { version: 'v3', gt: captcha.gt, challenge: captcha.challenge },
		});
	}

	async #claimed_result(status: 'claimed' | 'already_claimed', claimed_days: number): Promise<TeyvatCheckInResult> {
		const calendar = await _get_hoyolab_check_in_rewards(this.#client);
		try {
			const reward = calendar.awards[claimed_days - 1];
			if (!reward) throw new TypeError('claimed reward is missing from the monthly calendar');
			return schema_teyvat_check_in_result.assert({
				status,
				claimed_days,
				reward: { name: reward.name, amount: reward.cnt, icon: reward.icon },
			});
		} catch (cause) {
			throw _mapping_error('POST', CLAIM_ENDPOINT, cause);
		}
	}
}
