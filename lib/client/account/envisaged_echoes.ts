import { _enableAccountFeature } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _getHttpClient } from '#/client/request.ts';
import { _getHoyolabGenshinEnvisagedEchoes } from '#/endpoints/hoyolab/genshin/envisaged_echoes.ts';
import {
	schemaTeyvatAccountEnvisagedEcho,
	type TeyvatAccountEnvisagedEcho,
	type TeyvatEnvisagedEchoStatus,
} from '#/types/account/envisaged_echoes.ts';
import { _sleep } from '#/utils/misc.ts';
import type { TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/char_master';
const ENABLE_RETRY_DELAYS = [250, 500, 1_000, 2_000] as const;

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
	return await _getHoyolabGenshinEnvisagedEchoes(_getHttpClient(account.inst), account.uid, account.server);
}

export async function _getAccountEnvisagedEchoes(account: TeyvatAccount): Promise<TeyvatAccountEnvisagedEcho[]> {
	let raw: Awaited<ReturnType<typeof _requestEnvisagedEchoes>>;
	try {
		raw = await _requestEnvisagedEchoes(account);
	} catch (cause) {
		if (!(account.inst.autoEnable && _isPrivate(cause))) throw cause;
		await _enableAccountFeature(account, 'battle_chronicle', cause);
		let retryError: TeyvatApiError = cause;
		let enabled: Awaited<ReturnType<typeof _requestEnvisagedEchoes>> | undefined;
		for (const delay of ENABLE_RETRY_DELAYS) {
			await _sleep(delay);
			try {
				enabled = await _requestEnvisagedEchoes(account);
				break;
			} catch (retryCause) {
				if (!_isPrivate(retryCause)) throw retryCause;
				retryError = retryCause;
			}
		}
		if (!enabled) throw retryError;
		raw = enabled;
	}

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
