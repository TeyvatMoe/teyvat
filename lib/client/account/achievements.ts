import { TeyvatApiError, TeyvatError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _get_http_client } from '#/client/request.ts';
import { _get_hoyolab_genshin_achievements } from '#/endpoints/hoyolab/genshin/achievements.ts';
import { _enable_hoyolab_genshin_battle_chronicle } from '#/endpoints/hoyolab/settings.ts';
import {
	schema_teyvat_account_achievements,
	type TeyvatAccountAchievements,
	type TeyvatAchievementsOptions,
} from '#/types/account/achievements.ts';
import { _sleep } from '#/utils/misc.ts';
import type { TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/achievement';
const ENABLE_RETRY_DELAYS = [250, 500, 1_000, 2_000] as const;

function _is_achievements_private(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

async function _request_achievements(account: TeyvatAccount) {
	return await _get_hoyolab_genshin_achievements(_get_http_client(account.inst), account.uid, account.server);
}

export async function _get_account_achievements(
	account: TeyvatAccount,
	options: TeyvatAchievementsOptions = {},
): Promise<TeyvatAccountAchievements> {
	let raw: Awaited<ReturnType<typeof _request_achievements>>;
	try {
		raw = await _request_achievements(account);
	} catch (cause) {
		if (!(options.auto_enable && _is_achievements_private(cause))) throw cause;

		const owned = (await account.inst.accounts()).some((candidate) => candidate.uid === account.uid);
		if (!owned)
			throw new TeyvatError('Cannot enable achievements for an account not bound to these cookies', { cause });

		await _enable_hoyolab_genshin_battle_chronicle(_get_http_client(account.inst));
		let retry_error: TeyvatApiError = cause;
		let enabled: Awaited<ReturnType<typeof _request_achievements>> | undefined;
		for (const delay of ENABLE_RETRY_DELAYS) {
			await _sleep(delay);
			try {
				enabled = await _request_achievements(account);
				break;
			} catch (retry_cause) {
				if (!_is_achievements_private(retry_cause)) throw retry_cause;
				retry_error = retry_cause;
			}
		}
		if (!enabled) throw retry_error;
		raw = enabled;
	}

	try {
		return schema_teyvat_account_achievements.assert({
			completed: raw.achievement_num,
			categories: raw.list.map((category) => ({
				id: category.id,
				name: category.name,
				icon: category.icon,
				completed: category.finish_num,
				completion_percentage: category.show_percent ? category.percentage : null,
			})),
		});
	} catch (cause) {
		throw new TeyvatResponseValidationError('POST', ENDPOINT, [String(cause)], { cause });
	}
}
