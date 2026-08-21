import { TeyvatApiError, TeyvatError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _get_http_client } from '#/client/request.ts';
import { _get_hoyolab_genshin_calendar } from '#/endpoints/hoyolab/genshin/calendar.ts';
import { _enable_hoyolab_genshin_battle_chronicle } from '#/endpoints/hoyolab/settings.ts';
import {
	schema_teyvat_account_calendar,
	type TeyvatAccountCalendar,
	type TeyvatCalendarElement,
	type TeyvatCalendarOptions,
	type TeyvatCalendarStatus,
} from '#/types/account/calendar.ts';
import { _nullable_unix_date, _numeric_value, _sleep } from '#/utils/misc.ts';
import type { TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/act_calendar';
const ENABLE_RETRY_DELAYS = [250, 500, 1_000, 2_000] as const;

function _is_calendar_private(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

function _calendar_status(value: number): TeyvatCalendarStatus {
	if (value === 1) return 'upcoming';
	if (value === 2) return 'active';
	if (value === 3) return 'finished';
	return 'unknown';
}

function _calendar_element(value: string): TeyvatCalendarElement {
	const element = value.toLowerCase();
	if (['anemo', 'geo', 'electro', 'dendro', 'hydro', 'pyro', 'cryo'].includes(element))
		return element as TeyvatCalendarElement;
	return 'unknown';
}

async function _request_calendar(account: TeyvatAccount) {
	return await _get_hoyolab_genshin_calendar(_get_http_client(account.inst), account.uid, account.server);
}

export async function _get_account_calendar(
	account: TeyvatAccount,
	options: TeyvatCalendarOptions = {},
): Promise<TeyvatAccountCalendar> {
	let raw: Awaited<ReturnType<typeof _request_calendar>>;
	try {
		raw = await _request_calendar(account);
	} catch (cause) {
		if (!(options.auto_enable && _is_calendar_private(cause))) throw cause;

		const owned = (await account.inst.accounts()).some((candidate) => candidate.uid === account.uid);
		if (!owned)
			throw new TeyvatError('Cannot enable the event calendar for an account not bound to these cookies', {
				cause,
			});

		await _enable_hoyolab_genshin_battle_chronicle(_get_http_client(account.inst));
		let retry_error: TeyvatApiError = cause;
		let enabled: Awaited<ReturnType<typeof _request_calendar>> | undefined;
		for (const delay of ENABLE_RETRY_DELAYS) {
			await _sleep(delay);
			try {
				enabled = await _request_calendar(account);
				break;
			} catch (retry_cause) {
				if (!_is_calendar_private(retry_cause)) throw retry_cause;
				retry_error = retry_cause;
			}
		}
		if (!enabled) throw retry_error;
		raw = enabled;
	}

	try {
		const banner = (value: (typeof raw.avatar_card_pool_list)[number]) => ({
			id: value.pool_id,
			version: value.version_name,
			name: value.pool_name,
			starts_at: _nullable_unix_date(value.start_timestamp, 'banner.start_timestamp'),
			ends_at: _nullable_unix_date(value.end_timestamp, 'banner.end_timestamp'),
			countdown_seconds: value.countdown_seconds,
			jump_url: value.jump_url,
			status: _calendar_status(value.pool_status),
			characters: value.avatars.map((character) => ({
				id: character.id,
				name: character.name,
				icon: character.icon,
				element: _calendar_element(character.element),
				rarity: character.rarity,
			})),
			weapons: value.weapon.map((weapon) => ({
				id: weapon.id,
				name: weapon.name,
				icon: weapon.icon,
				rarity: weapon.rarity,
				wiki_url: weapon.wiki_url || null,
			})),
		});

		const activity = (value: (typeof raw.act_list)[number]) => ({
			id: value.id,
			name: value.name,
			description: value.desc.replaceAll('\\n', '\n'),
			strategy: value.strategy,
			type: value.type,
			starts_at: _nullable_unix_date(value.start_timestamp, 'activity.start_timestamp'),
			ends_at: _nullable_unix_date(value.end_timestamp, 'activity.end_timestamp'),
			countdown_seconds: value.countdown_seconds,
			status: _calendar_status(value.status),
			finished: value.is_finished,
			rewards: value.reward_list.map((reward) => ({
				id: reward.item_id,
				name: reward.name,
				icon: reward.icon,
				amount: reward.num,
				rarity: _numeric_value(reward.rarity, 'reward.rarity'),
				wiki_url: reward.wiki_url || null,
				featured: reward.homepage_show,
			})),
			exploration: value.explore_detail
				? { explored: value.explore_detail.explore_percent, finished: value.explore_detail.is_finished }
				: null,
			double_rewards: value.double_detail
				? { total: value.double_detail.total, remaining: value.double_detail.left }
				: null,
			spiral_abyss: value.tower_detail
				? {
						unlocked: value.tower_detail.is_unlock,
						maximum_stars: value.tower_detail.max_star,
						total_stars: value.tower_detail.total_star,
						has_data: value.tower_detail.has_data,
					}
				: null,
			imaginarium_theater: value.role_combat_detail
				? {
						unlocked: value.role_combat_detail.is_unlock,
						maximum_act: value.role_combat_detail.max_round_id,
						has_data: value.role_combat_detail.has_data,
					}
				: null,
		});

		return schema_teyvat_account_calendar.assert({
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
