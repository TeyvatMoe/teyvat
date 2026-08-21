import { _requestWithAutoEnable } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _getHttpClient } from '#/client/request.ts';
import { _getHoyolabGenshinEnvisagedEchoes } from '#/endpoints/hoyolab/genshin/envisaged_echoes.ts';
import {
	schemaTeyvatAccountEnvisagedEcho,
	type TeyvatAccountEnvisagedEcho,
	type TeyvatEnvisagedEchoStatus,
} from '#/types/account/envisaged_echoes.ts';
import { _getAccountOwner, type TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/char_master';

function _isPrivate(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

function _status(status: number): TeyvatEnvisagedEchoStatus {
	if (status === 1) return 'locked';
	if (status === 2) return 'unlocked';
	if (status === 3) return 'completed';
	return 'unknown';
}

async function _requestEnvisagedEchoes(account: TeyvatAccount) {
	return await _getHoyolabGenshinEnvisagedEchoes(
		_getHttpClient(_getAccountOwner(account)),
		account.uid,
		account.server,
	);
}

export async function _getAccountEnvisagedEchoes(account: TeyvatAccount): Promise<TeyvatAccountEnvisagedEcho[]> {
	const raw = await _requestWithAutoEnable(
		account,
		'battle_chronicle',
		() => _requestEnvisagedEchoes(account),
		_isPrivate,
	);

	try {
		return raw.list.map((echo) =>
			schemaTeyvatAccountEnvisagedEcho.assert({
				id: echo.avatar_id,
				name: echo.name,
				icon: echo.icon,
				status: _status(echo.status),
				hasNotification: echo.has_red_dot,
				levelId: echo.level_id,
			}),
		);
	} catch (cause) {
		throw new TeyvatResponseValidationError('GET', ENDPOINT, [String(cause)], { cause });
	}
}
