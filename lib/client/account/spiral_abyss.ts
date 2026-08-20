import { _get_hoyolab_genshin_spiral_abyss } from '../../endpoints/hoyolab/genshin/spiral_abyss.ts';
import {
	schema_teyvat_account_spiral_abyss,
	type TeyvatAccountSpiralAbyss,
	type TeyvatSpiralAbyssHalf,
	type TeyvatSpiralAbyssOptions,
	type TeyvatSpiralAbyssPeriod,
} from '../../types/account/spiral_abyss.ts';
import { _unix_date } from '../../utils/misc.ts';
import { TeyvatError, TeyvatResponseValidationError } from '../errors.ts';
import { _get_http_client } from '../request.ts';
import type { TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/spiralAbyss';

function _spiral_abyss_period(period: unknown): TeyvatSpiralAbyssPeriod {
	if (period === undefined || period === 'current') return 'current';
	if (period === 'previous') return 'previous';
	throw new TeyvatError('Spiral Abyss period must be current or previous');
}

function _spiral_abyss_half(index: number): TeyvatSpiralAbyssHalf {
	if (index === 1) return 'first';
	if (index === 2) return 'second';
	throw new TypeError(`Unknown Spiral Abyss battle half: ${index}`);
}

export async function _get_account_spiral_abyss(
	account: TeyvatAccount,
	options: TeyvatSpiralAbyssOptions = {},
): Promise<TeyvatAccountSpiralAbyss> {
	const period = _spiral_abyss_period(options.period);
	const raw = await _get_hoyolab_genshin_spiral_abyss(
		_get_http_client(account.inst),
		account.uid,
		account.server,
		period,
	);

	try {
		const ranked_characters = (characters: typeof raw.reveal_rank) =>
			characters
				.filter((character) => character.avatar_id !== 0)
				.map((character) => ({
					id: character.avatar_id,
					icon: character.avatar_icon,
					rarity: character.rarity,
					value: character.value,
				}));

		return schema_teyvat_account_spiral_abyss.assert({
			unlocked: raw.is_unlock,
			season: raw.schedule_id,
			starts_at: _unix_date(raw.start_time, 'start_time'),
			ends_at: _unix_date(raw.end_time, 'end_time'),
			total_battles: raw.total_battle_times,
			total_wins: raw.total_win_times,
			deepest_floor: raw.max_floor,
			total_stars: raw.total_star,
			floor_skipping: {
				occurred: raw.is_just_skipped_floor,
				destination: raw.skipped_floor,
			},
			ranks: {
				most_played: ranked_characters(raw.reveal_rank),
				most_kills: ranked_characters(raw.defeat_rank),
				strongest_strike: ranked_characters(raw.damage_rank),
				most_damage_taken: ranked_characters(raw.take_damage_rank),
				most_skills_used: ranked_characters(raw.normal_skill_rank),
				most_bursts_used: ranked_characters(raw.energy_skill_rank),
			},
			floors: raw.floors.map((floor) => ({
				number: floor.index,
				unlocked: floor.is_unlock,
				stars: floor.star,
				maximum_stars: floor.max_star,
				chambers: floor.levels.map((chamber) => ({
					number: chamber.index,
					stars: chamber.star,
					maximum_stars: chamber.max_star,
					battles: chamber.battles.map((battle) => ({
						half: _spiral_abyss_half(battle.index),
						completed_at: _unix_date(battle.timestamp, 'floors.levels.battles.timestamp'),
						characters: battle.avatars.map((character) => ({
							id: character.id,
							icon: character.icon,
							rarity: character.rarity,
							level: character.level,
						})),
					})),
					enemies: {
						first_half: (chamber.top_half_floor_monster ?? []).map((enemy) => ({
							name: enemy.name,
							icon: enemy.icon,
							level: enemy.level,
						})),
						second_half: (chamber.bottom_half_floor_monster ?? []).map((enemy) => ({
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
