import { _requestWithAutoEnable } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _getHttpClient } from '#/client/request.ts';
import { _getHoyolabGenshinSpiralAbyss } from '#/endpoints/hoyolab/genshin/spiral_abyss.ts';
import {
	schemaTeyvatAccountSpiralAbyss,
	type TeyvatAccountSpiralAbyss,
	type TeyvatSpiralAbyssHalf,
	type TeyvatSpiralAbyssOptions,
	type TeyvatSpiralAbyssPeriod,
} from '#/types/account/spiral_abyss.ts';
import { _unixDate } from '#/utils/misc.ts';
import { _getAccountOwner, type TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/spiralAbyss';

function _spiralAbyssPeriod(period: unknown): TeyvatSpiralAbyssPeriod {
	if (period === undefined || period === 'current') return 'current';
	if (period === 'previous') return 'previous';
	throw new TeyvatError('Spiral Abyss period must be current or previous');
}

function _spiralAbyssHalf(index: number): TeyvatSpiralAbyssHalf {
	if (index === 1) return 'first';
	if (index === 2) return 'second';
	throw new TypeError(`Unknown Spiral Abyss battle half: ${index}`);
}

function _isSpiralAbyssPrivate(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

export async function _getAccountSpiralAbyss(
	account: TeyvatAccount,
	options: TeyvatSpiralAbyssOptions = {},
): Promise<TeyvatAccountSpiralAbyss> {
	const period = _spiralAbyssPeriod(options.period);
	const raw = await _requestWithAutoEnable(
		account,
		'battle_chronicle',
		async () =>
			await _getHoyolabGenshinSpiralAbyss(
				_getHttpClient(_getAccountOwner(account)),
				account.uid,
				account.server,
				period,
			),
		_isSpiralAbyssPrivate,
	);

	try {
		const rankedCharacters = (characters: typeof raw.reveal_rank) =>
			characters
				.filter((character) => character.avatar_id !== 0)
				.map((character) => ({
					id: character.avatar_id,
					icon: character.avatar_icon,
					rarity: character.rarity,
					value: character.value,
				}));

		return schemaTeyvatAccountSpiralAbyss.assert({
			unlocked: raw.is_unlock,
			season: raw.schedule_id,
			startsAt: _unixDate(raw.start_time, 'start_time'),
			endsAt: _unixDate(raw.end_time, 'end_time'),
			totalBattles: raw.total_battle_times,
			totalWins: raw.total_win_times,
			deepestFloor: raw.max_floor,
			totalStars: raw.total_star,
			floorSkipping: {
				occurred: raw.is_just_skipped_floor,
				destination: raw.skipped_floor,
			},
			ranks: {
				mostPlayed: rankedCharacters(raw.reveal_rank),
				mostKills: rankedCharacters(raw.defeat_rank),
				strongestStrike: rankedCharacters(raw.damage_rank),
				mostDamageTaken: rankedCharacters(raw.take_damage_rank),
				mostSkillsUsed: rankedCharacters(raw.normal_skill_rank),
				mostBurstsUsed: rankedCharacters(raw.energy_skill_rank),
			},
			floors: raw.floors.map((floor) => ({
				number: floor.index,
				unlocked: floor.is_unlock,
				stars: floor.star,
				maximumStars: floor.max_star,
				chambers: floor.levels.map((chamber) => ({
					number: chamber.index,
					stars: chamber.star,
					maximumStars: chamber.max_star,
					battles: chamber.battles.map((battle) => ({
						half: _spiralAbyssHalf(battle.index),
						completedAt: _unixDate(battle.timestamp, 'floors.levels.battles.timestamp'),
						characters: battle.avatars.map((character) => ({
							id: character.id,
							icon: character.icon,
							rarity: character.rarity,
							level: character.level,
						})),
					})),
					enemies: {
						firstHalf: (chamber.top_half_floor_monster ?? []).map((enemy) => ({
							name: enemy.name,
							icon: enemy.icon,
							level: enemy.level,
						})),
						secondHalf: (chamber.bottom_half_floor_monster ?? []).map((enemy) => ({
							name: enemy.name,
							icon: enemy.icon,
							level: enemy.level,
						})),
					},
				})),
			})),
		});
	} catch (cause) {
		throw new TeyvatResponseValidationError('GET', ENDPOINT, [String(cause)], { cause });
	}
}
