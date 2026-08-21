import { _enable_account_feature } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _get_http_client } from '#/client/request.ts';
import { _get_hoyolab_genshin_envisaged_echoes } from '#/endpoints/hoyolab/genshin/envisaged_echoes.ts';
import {
	schema_teyvat_account_envisaged_echo,
	type TeyvatAccountEnvisagedEcho,
	type TeyvatEnvisagedEchoStatus,
} from '#/types/account/envisaged_echoes.ts';
import { _sleep } from '#/utils/misc.ts';
import type { TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/char_master';
const ENABLE_RETRY_DELAYS = [250, 500, 1_000, 2_000] as const;

function _is_private(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

function _status(status: number): TeyvatEnvisagedEchoStatus {
	if (status === 1) return 'locked';
	if (status === 2) return 'unlocked';
	if (status === 3) return 'completed';
	return 'unknown';
}

async function _request_envisaged_echoes(account: TeyvatAccount) {
	return await _get_hoyolab_genshin_envisaged_echoes(_get_http_client(account.inst), account.uid, account.server);
}

export async function _get_account_envisaged_echoes(account: TeyvatAccount): Promise<TeyvatAccountEnvisagedEcho[]> {
	let raw: Awaited<ReturnType<typeof _request_envisaged_echoes>>;
	try {
		raw = await _request_envisaged_echoes(account);
	} catch (cause) {
		if (!(account.inst.auto_enable && _is_private(cause))) throw cause;
		await _enable_account_feature(account, 'battle_chronicle', cause);
		let retry_error: TeyvatApiError = cause;
		let enabled: Awaited<ReturnType<typeof _request_envisaged_echoes>> | undefined;
		for (const delay of ENABLE_RETRY_DELAYS) {
			await _sleep(delay);
			try {
				enabled = await _request_envisaged_echoes(account);
				break;
			} catch (retry_cause) {
				if (!_is_private(retry_cause)) throw retry_cause;
				retry_error = retry_cause;
			}
		}
		if (!enabled) throw retry_error;
		raw = enabled;
	}

	try {
		return raw.list.map((echo) =>
			schema_teyvat_account_envisaged_echo.assert({
				id: echo.avatar_id,
				name: echo.name,
				icon: echo.icon,
				status: _status(echo.status),
				has_notification: echo.has_red_dot,
				level_id: echo.level_id,
			}),
		);
	} catch (cause) {
		throw new TeyvatResponseValidationError('GET', ENDPOINT, [String(cause)], { cause });
	}
}
