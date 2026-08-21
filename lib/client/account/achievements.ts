import { _enableAccountFeature } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _getHttpClient } from '#/client/request.ts';
import { _getHoyolabGenshinAchievements } from '#/endpoints/hoyolab/genshin/achievements.ts';
import { schemaTeyvatAccountAchievements, type TeyvatAccountAchievements } from '#/types/account/achievements.ts';
import { _sleep } from '#/utils/misc.ts';
import type { TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/achievement';
const ENABLE_RETRY_DELAYS = [250, 500, 1_000, 2_000] as const;

function _isAchievementsPrivate(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

async function _requestAchievements(account: TeyvatAccount) {
	return await _getHoyolabGenshinAchievements(_getHttpClient(account.inst), account.uid, account.server);
}

export async function _getAccountAchievements(account: TeyvatAccount): Promise<TeyvatAccountAchievements> {
	let raw: Awaited<ReturnType<typeof _requestAchievements>>;
	try {
		raw = await _requestAchievements(account);
	} catch (cause) {
		if (!(account.inst.autoEnable && _isAchievementsPrivate(cause))) throw cause;
		await _enableAccountFeature(account, 'battle_chronicle', cause);
		let retryError: TeyvatApiError = cause;
		let enabled: Awaited<ReturnType<typeof _requestAchievements>> | undefined;
		for (const delay of ENABLE_RETRY_DELAYS) {
			await _sleep(delay);
			try {
				enabled = await _requestAchievements(account);
				break;
			} catch (retryCause) {
				if (!_isAchievementsPrivate(retryCause)) throw retryCause;
				retryError = retryCause;
			}
		}
		if (!enabled) throw retryError;
		raw = enabled;
	}

	try {
		return schemaTeyvatAccountAchievements.assert({
			completed: raw.achievement_num,
			categories: raw.list.map((category) => ({
				id: category.id,
				name: category.name,
				icon: category.icon,
				completed: category.finish_num,
				completionPercentage: category.show_percent ? category.percentage : null,
			})),
		});
	} catch (cause) {
		throw new TeyvatResponseValidationError('POST', ENDPOINT, [String(cause)], { cause });
	}
}
