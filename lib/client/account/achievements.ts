import { _requestWithAutoEnable } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _getHttpClient } from '#/client/request.ts';
import { _getHoyolabGenshinAchievements } from '#/endpoints/hoyolab/genshin/achievements.ts';
import { schemaTeyvatAccountAchievements, type TeyvatAccountAchievements } from '#/types/account/achievements.ts';
import { _getAccountOwner, type TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/achievement';

function _isAchievementsPrivate(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

async function _requestAchievements(account: TeyvatAccount) {
	return await _getHoyolabGenshinAchievements(_getHttpClient(_getAccountOwner(account)), account.uid, account.server);
}

export async function _getAccountAchievements(account: TeyvatAccount): Promise<TeyvatAccountAchievements> {
	const raw = await _requestWithAutoEnable(
		account,
		'battle_chronicle',
		() => _requestAchievements(account),
		_isAchievementsPrivate,
	);

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
