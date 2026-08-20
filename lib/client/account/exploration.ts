import { _get_hoyolab_genshin_exploration } from '../../endpoints/hoyolab/genshin/exploration.ts';
import { _enable_hoyolab_genshin_battle_chronicle } from '../../endpoints/hoyolab/settings.ts';
import {
	schema_teyvat_account_exploration,
	type TeyvatAccountExploration,
	type TeyvatExplorationOptions,
} from '../../types/account/exploration.ts';
import { _sleep } from '../../utils/misc.ts';
import { TeyvatApiError, TeyvatError, TeyvatResponseValidationError } from '../errors.ts';
import { _get_http_client } from '../request.ts';
import type { TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/index';
const ENABLE_RETRY_DELAYS = [250, 500, 1_000, 2_000] as const;

function _is_exploration_private(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

async function _request_exploration(account: TeyvatAccount) {
	return await _get_hoyolab_genshin_exploration(_get_http_client(account.inst), account.uid, account.server);
}

function _explored(raw_percentage: number): number {
	if (!Number.isSafeInteger(raw_percentage) || raw_percentage < 0)
		throw new TypeError('exploration_percentage must be a nonnegative safe integer');
	return raw_percentage / 10;
}

export async function _get_account_exploration(
	account: TeyvatAccount,
	options: TeyvatExplorationOptions = {},
): Promise<TeyvatAccountExploration[]> {
	let raw: Awaited<ReturnType<typeof _request_exploration>>;
	try {
		raw = await _request_exploration(account);
	} catch (cause) {
		if (!(options.auto_enable && _is_exploration_private(cause))) throw cause;

		const owned = (await account.inst.accounts()).some((candidate) => candidate.uid === account.uid);
		if (!owned)
			throw new TeyvatError('Cannot enable exploration for an account not bound to these cookies', { cause });

		await _enable_hoyolab_genshin_battle_chronicle(_get_http_client(account.inst));
		let retry_error: TeyvatApiError = cause;
		let enabled_exploration: Awaited<ReturnType<typeof _request_exploration>> | undefined;
		for (const delay of ENABLE_RETRY_DELAYS) {
			await _sleep(delay);
			try {
				enabled_exploration = await _request_exploration(account);
				break;
			} catch (retry_cause) {
				if (!_is_exploration_private(retry_cause)) throw retry_cause;
				retry_error = retry_cause;
			}
		}
		if (!enabled_exploration) throw retry_error;
		raw = enabled_exploration;
	}

	try {
		return raw.world_explorations.map((exploration) => {
			const offerings = (exploration.offerings ?? []).map((offering) => ({
				name: offering.name,
				level: offering.level,
				icon: offering.icon ?? '',
			}));
			if (exploration.type === 'Reputation' && !offerings.some((offering) => offering.name === 'Reputation')) {
				offerings.unshift({ name: 'Reputation', level: exploration.level, icon: '' });
			}

			return schema_teyvat_account_exploration.assert({
				id: exploration.id,
				parent_id: exploration.parent_id,
				name: exploration.name,
				explored: _explored(exploration.exploration_percentage),
				visuals: {
					icon: exploration.icon,
					inner_icon: exploration.inner_icon,
					background_image: exploration.background_image,
					cover: exploration.cover,
					map_url: exploration.map_url,
				},
				offerings,
				areas: (exploration.area_exploration_list ?? []).map((area) => ({
					name: area.name,
					explored: _explored(area.exploration_percentage),
				})),
				bosses: (exploration.boss_list ?? []).map((boss) => ({ name: boss.name, kills: boss.kill_num })),
				natlan_tribes: (exploration.natan_reputation?.tribal_list ?? []).map((tribe) => ({
					id: tribe.id,
					name: tribe.name,
					level: tribe.level,
					icon: tribe.icon,
					image: tribe.image,
				})),
			});
		});
	} catch (cause) {
		throw new TeyvatResponseValidationError('GET', ENDPOINT, [String(cause)], { cause });
	}
}
