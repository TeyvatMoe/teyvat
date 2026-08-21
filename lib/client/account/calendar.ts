import { _requestWithAutoEnable } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _getHttpClient } from '#/client/request.ts';
import { _getHoyolabGenshinCalendar } from '#/endpoints/hoyolab/genshin/calendar.ts';
import {
	schemaTeyvatAccountCalendar,
	type TeyvatAccountCalendar,
	type TeyvatCalendarElement,
	type TeyvatCalendarStatus,
} from '#/types/account/calendar.ts';
import { _nullableUnixDate, _numericValue } from '#/utils/misc.ts';
import type { TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/act_calendar';

function _isCalendarPrivate(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

function _calendarStatus(value: number): TeyvatCalendarStatus {
	if (value === 1) return 'upcoming';
	if (value === 2) return 'active';
	if (value === 3) return 'finished';
	return 'unknown';
}

function _calendarElement(value: string): TeyvatCalendarElement {
	const element = value.toLowerCase();
	if (['anemo', 'geo', 'electro', 'dendro', 'hydro', 'pyro', 'cryo'].includes(element))
		return element as TeyvatCalendarElement;
	return 'unknown';
}

async function _requestCalendar(account: TeyvatAccount) {
	return await _getHoyolabGenshinCalendar(_getHttpClient(account.inst), account.uid, account.server);
}

export async function _getAccountCalendar(account: TeyvatAccount): Promise<TeyvatAccountCalendar> {
	const raw = await _requestWithAutoEnable(
		account,
		'battle_chronicle',
		() => _requestCalendar(account),
		_isCalendarPrivate,
	);

	try {
		const banner = (value: (typeof raw.avatar_card_pool_list)[number]) => ({
			id: value.pool_id,
			version: value.version_name,
			name: value.pool_name,
			startsAt: _nullableUnixDate(value.start_timestamp, 'banner.start_timestamp'),
			endsAt: _nullableUnixDate(value.end_timestamp, 'banner.end_timestamp'),
			countdownSeconds: value.countdown_seconds,
			jumpUrl: value.jump_url,
			status: _calendarStatus(value.pool_status),
			characters: value.avatars.map((character) => ({
				id: character.id,
				name: character.name,
				icon: character.icon,
				element: _calendarElement(character.element),
				rarity: character.rarity,
			})),
			weapons: value.weapon.map((weapon) => ({
				id: weapon.id,
				name: weapon.name,
				icon: weapon.icon,
				rarity: weapon.rarity,
				wikiUrl: weapon.wiki_url || null,
			})),
		});

		const activity = (value: (typeof raw.act_list)[number]) => ({
			id: value.id,
			name: value.name,
			description: value.desc.replaceAll('\\n', '\n'),
			strategy: value.strategy,
			type: value.type,
			startsAt: _nullableUnixDate(value.start_timestamp, 'activity.start_timestamp'),
			endsAt: _nullableUnixDate(value.end_timestamp, 'activity.end_timestamp'),
			countdownSeconds: value.countdown_seconds,
			status: _calendarStatus(value.status),
			finished: value.is_finished,
			rewards: value.reward_list.map((reward) => ({
				id: reward.item_id,
				name: reward.name,
				icon: reward.icon,
				amount: reward.num,
				rarity: _numericValue(reward.rarity, 'reward.rarity'),
				wikiUrl: reward.wiki_url || null,
				featured: reward.homepage_show,
			})),
			exploration: value.explore_detail
				? { explored: value.explore_detail.explore_percent, finished: value.explore_detail.is_finished }
				: null,
			doubleRewards: value.double_detail
				? { total: value.double_detail.total, remaining: value.double_detail.left }
				: null,
			spiralAbyss: value.tower_detail
				? {
						unlocked: value.tower_detail.is_unlock,
						maximumStars: value.tower_detail.max_star,
						totalStars: value.tower_detail.total_star,
						hasData: value.tower_detail.has_data,
					}
				: null,
			imaginariumTheater: value.role_combat_detail
				? {
						unlocked: value.role_combat_detail.is_unlock,
						maximumAct: value.role_combat_detail.max_round_id,
						hasData: value.role_combat_detail.has_data,
					}
				: null,
		});

		return schemaTeyvatAccountCalendar.assert({
			banners: {
				characters: raw.avatar_card_pool_list.map(banner),
				weapons: raw.weapon_card_pool_list.map(banner),
				chronicled: raw.mixed_card_pool_list.map(banner),
			},
			activities: {
				events: raw.act_list.map(activity),
				challenges: raw.fixed_act_list.map(activity),
			},
		});
	} catch (cause) {
		throw new TeyvatResponseValidationError('POST', ENDPOINT, [String(cause)], { cause });
	}
}
