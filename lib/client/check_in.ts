import {
	_claimHoyolabCheckIn,
	_getHoyolabCheckInHistoryPage,
	_getHoyolabCheckInInfo,
	_getHoyolabCheckInRewards,
	type HoyolabCheckInCaptcha,
} from '#/endpoints/hoyolab/genshin/check_in.ts';
import {
	schemaTeyvatCheckInCaptchaSolution,
	schemaTeyvatCheckInHistoryEntry,
	schemaTeyvatCheckInInfo,
	schemaTeyvatCheckInResult,
	type TeyvatCheckInCaptchaSolution,
	type TeyvatCheckInClaimOptions,
	type TeyvatCheckInClient,
	type TeyvatCheckInHistoryEntry,
	type TeyvatCheckInHistoryOptions,
	type TeyvatCheckInInfo,
	type TeyvatCheckInResult,
} from '#/types/check_in.ts';
import type { TeyvatPaginator } from '#/types/paginator.ts';
import { _matchesGeetestV3Challenge } from '#/utils/captcha.ts';
import { _currentUtcOffsetDay, _hoyolabDatetime } from '#/utils/misc.ts';
import { TeyvatError, TeyvatResponseValidationError } from './errors.ts';
import { _TeyvatPaginator } from './paginator.ts';
import { _getHttpClient, type TeyvatHttpClient } from './request.ts';

const INFO_ENDPOINT = '/event/sol/info';
const CLAIM_ENDPOINT = '/event/sol/sign';
const HISTORY_ENDPOINT = '/event/sol/award';
const PAGE_SIZE = 10;

function _mappingError(method: string, endpoint: string, cause: unknown): TeyvatResponseValidationError {
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
	#pendingCaptcha?: HoyolabCheckInCaptcha;
	#operation: Promise<void> = Promise.resolve();

	constructor(owner: object) {
		this.#client = _getHttpClient(owner);
	}

	async info(): Promise<TeyvatCheckInInfo> {
		const [status, calendar] = await Promise.all([
			_getHoyolabCheckInInfo(this.#client),
			_getHoyolabCheckInRewards(this.#client),
		]);
		try {
			return schemaTeyvatCheckInInfo.assert({
				signedIn: status.is_sign,
				claimedDays: status.total_sign_day,
				missedDays: Math.max(0, _currentUtcOffsetDay() - status.total_sign_day),
				rewards: calendar.awards.map((reward) => ({
					name: reward.name,
					amount: reward.cnt,
					icon: reward.icon,
				})),
			});
		} catch (cause) {
			throw _mappingError('GET', INFO_ENDPOINT, cause);
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
			initialCursor: 1,
			limit,
			getPage: async (page) => {
				const raw = await _getHoyolabCheckInHistoryPage(this.#client, page);
				try {
					const items = raw.list.map((entry) =>
						schemaTeyvatCheckInHistoryEntry.assert({
							id: entry.id,
							name: entry.name,
							amount: entry.cnt,
							icon: entry.img,
							claimedAt: _hoyolabDatetime(entry.created_at, 8, 'created_at'),
						}),
					);
					return { items, nextCursor: items.length < PAGE_SIZE ? null : page + 1 };
				} catch (cause) {
					throw _mappingError('GET', HISTORY_ENDPOINT, cause);
				}
			},
		});
	}

	async #claim(options: TeyvatCheckInClaimOptions): Promise<TeyvatCheckInResult> {
		const solution = this.#solution(options.captchaSolution);
		const status = await _getHoyolabCheckInInfo(this.#client);
		if (status.is_sign) {
			this.#pendingCaptcha = undefined;
			return await this.#claimedResult('already_claimed', status.total_sign_day);
		}
		if (this.#pendingCaptcha && !solution) return this.#captchaResult(this.#pendingCaptcha);

		const result = await _claimHoyolabCheckIn(this.#client, solution);
		if (result.status === 'captcha_required') {
			this.#pendingCaptcha = result.captcha;
			return this.#captchaResult(result.captcha);
		}

		this.#pendingCaptcha = undefined;
		const updated = await _getHoyolabCheckInInfo(this.#client);
		if (!updated.is_sign) {
			throw new TeyvatResponseValidationError('POST', CLAIM_ENDPOINT, [
				'daily check-in was not marked as claimed after a successful response',
			]);
		}
		return await this.#claimedResult(result.status, updated.total_sign_day);
	}

	#solution(value: unknown): TeyvatCheckInCaptchaSolution | undefined {
		if (value === undefined) return undefined;
		if (!this.#pendingCaptcha) throw new TeyvatError('Daily check-in is not awaiting a captcha solution');
		let solution: TeyvatCheckInCaptchaSolution;
		try {
			solution = schemaTeyvatCheckInCaptchaSolution.assert(value);
		} catch {
			throw new TeyvatError('Invalid daily check-in captcha solution');
		}
		if (!_matchesGeetestV3Challenge(solution.geetestChallenge, this.#pendingCaptcha.challenge))
			throw new TeyvatError('Captcha solution does not match the pending daily check-in challenge');
		return solution;
	}

	#captchaResult(captcha: HoyolabCheckInCaptcha): TeyvatCheckInResult {
		return schemaTeyvatCheckInResult.assert({
			status: 'captcha_required',
			captcha: { version: 'v3', gt: captcha.gt, challenge: captcha.challenge },
		});
	}

	async #claimedResult(status: 'claimed' | 'already_claimed', claimedDays: number): Promise<TeyvatCheckInResult> {
		const calendar = await _getHoyolabCheckInRewards(this.#client);
		try {
			const reward = calendar.awards[claimedDays - 1];
			if (!reward) throw new TypeError('claimed reward is missing from the monthly calendar');
			return schemaTeyvatCheckInResult.assert({
				status,
				claimedDays: claimedDays,
				reward: { name: reward.name, amount: reward.cnt, icon: reward.icon },
			});
		} catch (cause) {
			throw _mappingError('POST', CLAIM_ENDPOINT, cause);
		}
	}
}
