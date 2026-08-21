import { _enableAccountFeature } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _getHttpClient } from '#/client/request.ts';
import { _getHoyolabGenshinStygianOnslaught } from '#/endpoints/hoyolab/genshin/stygian_onslaught.ts';
import {
	schemaTeyvatAccountStygianOnslaught,
	type TeyvatAccountStygianOnslaught,
} from '#/types/account/stygian_onslaught.ts';
import { _hoyolabDate, _sleep } from '#/utils/misc.ts';
import type { TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/hard_challenge';
const ENABLE_RETRY_DELAYS = [250, 500, 1_000, 2_000] as const;

function _isStygianOnslaughtPrivate(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

function _metricType(value: number): 'strongest_strike' | 'highest_damage' | 'unknown' {
	if (value === 1) return 'strongest_strike';
	if (value === 2) return 'highest_damage';
	return 'unknown';
}

function _tagType(value: number): 'advantage' | 'disadvantage' | 'unknown' {
	if (value === 0) return 'disadvantage';
	if (value === 1) return 'advantage';
	return 'unknown';
}

function _tagElements(description: string): Array<'cryo' | 'hydro' | 'pyro' | 'dendro'> {
	const markers = [
		['{SPRITE_PRESET#11001}', 'cryo'],
		['{SPRITE_PRESET#11002}', 'hydro'],
		['{SPRITE_PRESET#11003}', 'pyro'],
		['{SPRITE_PRESET#11007}', 'dendro'],
	] as const;
	return markers.filter(([marker]) => description.includes(marker)).map(([, element]) => element);
}

async function _requestStygianOnslaught(account: TeyvatAccount) {
	return await _getHoyolabGenshinStygianOnslaught(_getHttpClient(account.inst), account.uid, account.server);
}

export async function _getAccountStygianOnslaught(account: TeyvatAccount): Promise<TeyvatAccountStygianOnslaught[]> {
	let raw: Awaited<ReturnType<typeof _requestStygianOnslaught>>;
	try {
		raw = await _requestStygianOnslaught(account);
	} catch (cause) {
		if (!(account.inst.autoEnable && _isStygianOnslaughtPrivate(cause))) throw cause;
		await _enableAccountFeature(account, 'battle_chronicle', cause);
		let retryError: TeyvatApiError = cause;
		let enabled: Awaited<ReturnType<typeof _requestStygianOnslaught>> | undefined;
		for (const delay of ENABLE_RETRY_DELAYS) {
			await _sleep(delay);
			try {
				enabled = await _requestStygianOnslaught(account);
				break;
			} catch (retryCause) {
				if (!_isStygianOnslaughtPrivate(retryCause)) throw retryCause;
				retryError = retryCause;
			}
		}
		if (!enabled) throw retryError;
		raw = enabled;
	}

	try {
		const mode = (value: (typeof raw.data)[number]['single']) => ({
			hasData: value.has_data,
			bestRecord: value.best
				? {
						difficulty: value.best.difficulty,
						completionSeconds: value.best.second,
						badgeIcon: value.best.icon.split(',').at(-1)?.trim() ?? '',
					}
				: null,
			challenges: value.challenge.map((challenge) => ({
				name: challenge.name,
				completionSeconds: challenge.second,
				team: challenge.teams.map((character) => ({
					id: character.avatar_id,
					name: character.name,
					element: character.element.toLowerCase(),
					icon: character.image,
					level: character.level,
					rarity: character.rarity,
					constellation: character.rank,
				})),
				bestCharacters: challenge.best_avatar.map((character) => ({
					id: character.avatar_id,
					sideIcon: character.side_icon,
					value: character.dps,
					metric: _metricType(character.type),
				})),
				enemy: {
					id: challenge.monster.monster_id,
					name: challenge.monster.name,
					level: challenge.monster.level,
					icon: challenge.monster.icon,
					descriptions: challenge.monster.desc,
					tags: challenge.monster.tags.map((tag) => ({
						type: _tagType(tag.type),
						description: tag.desc,
						elements: _tagElements(tag.desc),
					})),
				},
			})),
		});

		return raw.data
			.filter((season) => season.schedule.is_valid)
			.map((season) =>
				schemaTeyvatAccountStygianOnslaught.assert({
					schedule: {
						id: season.schedule.schedule_id,
						name: season.schedule.name,
						startsAt: _hoyolabDate(
							season.schedule.start_date_time,
							account.server,
							'schedule.start_date_time',
						),
						endsAt: _hoyolabDate(season.schedule.end_date_time, account.server, 'schedule.end_date_time'),
					},
					singlePlayer: mode(season.single),
					multiplayer: mode(season.mp),
				}),
			);
	} catch (cause) {
		throw new TeyvatResponseValidationError('GET', ENDPOINT, [String(cause)], { cause });
	}
}
