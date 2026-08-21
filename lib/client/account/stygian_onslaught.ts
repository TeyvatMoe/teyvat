import { _enable_account_feature } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _get_http_client } from '#/client/request.ts';
import { _get_hoyolab_genshin_stygian_onslaught } from '#/endpoints/hoyolab/genshin/stygian_onslaught.ts';
import {
	schema_teyvat_account_stygian_onslaught,
	type TeyvatAccountStygianOnslaught,
} from '#/types/account/stygian_onslaught.ts';
import { _hoyolab_date, _sleep } from '#/utils/misc.ts';
import type { TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/hard_challenge';
const ENABLE_RETRY_DELAYS = [250, 500, 1_000, 2_000] as const;

function _is_stygian_onslaught_private(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

function _metric_type(value: number): 'strongest_strike' | 'highest_damage' | 'unknown' {
	if (value === 1) return 'strongest_strike';
	if (value === 2) return 'highest_damage';
	return 'unknown';
}

function _tag_type(value: number): 'advantage' | 'disadvantage' | 'unknown' {
	if (value === 0) return 'disadvantage';
	if (value === 1) return 'advantage';
	return 'unknown';
}

function _tag_elements(description: string): Array<'cryo' | 'hydro' | 'pyro' | 'dendro'> {
	const markers = [
		['{SPRITE_PRESET#11001}', 'cryo'],
		['{SPRITE_PRESET#11002}', 'hydro'],
		['{SPRITE_PRESET#11003}', 'pyro'],
		['{SPRITE_PRESET#11007}', 'dendro'],
	] as const;
	return markers.filter(([marker]) => description.includes(marker)).map(([, element]) => element);
}

async function _request_stygian_onslaught(account: TeyvatAccount) {
	return await _get_hoyolab_genshin_stygian_onslaught(_get_http_client(account.inst), account.uid, account.server);
}

export async function _get_account_stygian_onslaught(account: TeyvatAccount): Promise<TeyvatAccountStygianOnslaught[]> {
	let raw: Awaited<ReturnType<typeof _request_stygian_onslaught>>;
	try {
		raw = await _request_stygian_onslaught(account);
	} catch (cause) {
		if (!(account.inst.auto_enable && _is_stygian_onslaught_private(cause))) throw cause;
		await _enable_account_feature(account, 'battle_chronicle', cause);
		let retry_error: TeyvatApiError = cause;
		let enabled: Awaited<ReturnType<typeof _request_stygian_onslaught>> | undefined;
		for (const delay of ENABLE_RETRY_DELAYS) {
			await _sleep(delay);
			try {
				enabled = await _request_stygian_onslaught(account);
				break;
			} catch (retry_cause) {
				if (!_is_stygian_onslaught_private(retry_cause)) throw retry_cause;
				retry_error = retry_cause;
			}
		}
		if (!enabled) throw retry_error;
		raw = enabled;
	}

	try {
		const mode = (value: (typeof raw.data)[number]['single']) => ({
			has_data: value.has_data,
			best_record: value.best
				? {
						difficulty: value.best.difficulty,
						completion_seconds: value.best.second,
						badge_icon: value.best.icon.split(',').at(-1)?.trim() ?? '',
					}
				: null,
			challenges: value.challenge.map((challenge) => ({
				name: challenge.name,
				completion_seconds: challenge.second,
				team: challenge.teams.map((character) => ({
					id: character.avatar_id,
					name: character.name,
					element: character.element.toLowerCase(),
					icon: character.image,
					level: character.level,
					rarity: character.rarity,
					constellation: character.rank,
				})),
				best_characters: challenge.best_avatar.map((character) => ({
					id: character.avatar_id,
					side_icon: character.side_icon,
					value: character.dps,
					metric: _metric_type(character.type),
				})),
				enemy: {
					id: challenge.monster.monster_id,
					name: challenge.monster.name,
					level: challenge.monster.level,
					icon: challenge.monster.icon,
					descriptions: challenge.monster.desc,
					tags: challenge.monster.tags.map((tag) => ({
						type: _tag_type(tag.type),
						description: tag.desc,
						elements: _tag_elements(tag.desc),
					})),
				},
			})),
		});

		return raw.data
			.filter((season) => season.schedule.is_valid)
			.map((season) =>
				schema_teyvat_account_stygian_onslaught.assert({
					schedule: {
						id: season.schedule.schedule_id,
						name: season.schedule.name,
						starts_at: _hoyolab_date(
							season.schedule.start_date_time,
							account.server,
							'schedule.start_date_time',
						),
						ends_at: _hoyolab_date(season.schedule.end_date_time, account.server, 'schedule.end_date_time'),
					},
					single_player: mode(season.single),
					multiplayer: mode(season.mp),
				}),
			);
	} catch (cause) {
		throw new TeyvatResponseValidationError('GET', ENDPOINT, [String(cause)], { cause });
	}
}
