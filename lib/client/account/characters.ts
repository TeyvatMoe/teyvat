import { _enable_account_feature } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _get_http_client } from '#/client/request.ts';
import {
	_get_hoyolab_genshin_character_details,
	_get_hoyolab_genshin_character_ids,
} from '#/endpoints/hoyolab/genshin/characters.ts';
import {
	schema_teyvat_account_character,
	type TeyvatAccountCharacter,
	type TeyvatCharacterElement,
	type TeyvatCharactersOptions,
	type TeyvatWeaponType,
} from '#/types/account/character.ts';
import { _sleep } from '#/utils/misc.ts';
import type { TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/character/detail';
const ENABLE_RETRY_DELAYS = [250, 500, 1_000, 2_000] as const;

function _is_character_details_private(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

function _character_ids(ids: number[] | undefined): number[] | undefined {
	if (ids === undefined) return undefined;
	const unique = new Set<number>();
	for (const id of ids) {
		if (!Number.isSafeInteger(id) || id <= 0) throw new TeyvatError('Character IDs must be positive safe integers');
		unique.add(id);
	}
	return [...unique];
}

function _character_element(element: string): TeyvatCharacterElement {
	const normalized = element.toLowerCase();
	if (
		normalized === 'anemo' ||
		normalized === 'geo' ||
		normalized === 'electro' ||
		normalized === 'dendro' ||
		normalized === 'hydro' ||
		normalized === 'pyro' ||
		normalized === 'cryo'
	)
		return normalized;
	throw new TypeError(`Unknown character element: ${element}`);
}

function _weapon_type(type: number): TeyvatWeaponType {
	if (type === 1) return 'sword';
	if (type === 10) return 'catalyst';
	if (type === 11) return 'claymore';
	if (type === 12) return 'bow';
	if (type === 13) return 'polearm';
	throw new TypeError(`Unknown weapon type: ${type}`);
}

async function _request_characters(account: TeyvatAccount, ids?: number[]) {
	const client = _get_http_client(account.inst);
	const character_ids = ids ?? (await _get_hoyolab_genshin_character_ids(client, account.uid, account.server));
	if (character_ids.length === 0) return undefined;
	return await _get_hoyolab_genshin_character_details(client, account.uid, account.server, character_ids);
}

export async function _get_account_characters(
	account: TeyvatAccount,
	options: TeyvatCharactersOptions = {},
): Promise<TeyvatAccountCharacter[]> {
	const ids = _character_ids(options.ids);
	if (ids?.length === 0) return [];

	let raw: Awaited<ReturnType<typeof _request_characters>>;
	try {
		raw = await _request_characters(account, ids);
	} catch (cause) {
		if (!(account.inst.auto_enable && _is_character_details_private(cause))) throw cause;
		await _enable_account_feature(account, 'character_details', cause);
		let retry_error: TeyvatApiError = cause;
		for (const delay of ENABLE_RETRY_DELAYS) {
			await _sleep(delay);
			try {
				raw = await _request_characters(account, ids);
				break;
			} catch (retry_cause) {
				if (!_is_character_details_private(retry_cause)) throw retry_cause;
				retry_error = retry_cause;
			}
		}
		if (!raw) throw retry_error;
	}

	if (!raw) return [];
	try {
		const property_info = (property_type: number) => {
			const info = raw.property_map[String(property_type)];
			if (!info) throw new TypeError(`Missing property definition for property type ${property_type}`);
			return {
				type: info.property_type,
				name: info.name.replaceAll('\u00a0', ' '),
				icon: info.icon,
				filter_name: info.filter_name.replaceAll('\u00a0', ' '),
			};
		};
		const property_value = (property: { property_type: number; base: string; add: string; final: string }) => ({
			base: property.base,
			add: property.add,
			final: property.final,
			info: property_info(property.property_type),
		});
		const artifact_stat = (property: { property_type: number; value: string; times: number }) => ({
			value: property.value,
			times: property.times,
			info: property_info(property.property_type),
		});

		return raw.list.map((character) => {
			const base = character.base;
			const rarity = base.rarity > 100 ? base.rarity - 100 : base.rarity;
			const set_counts = new Map<number, number>();
			for (const artifact of character.relics)
				set_counts.set(artifact.set.id, (set_counts.get(artifact.set.id) ?? 0) + 1);

			return schema_teyvat_account_character.assert({
				id: base.id,
				name: base.name,
				element: _character_element(base.element),
				rarity,
				collab: base.rarity > 100 || base.id === 10000062,
				icon: base.icon,
				side_icon: base.side_icon,
				display_image: base.image,
				level: base.level,
				friendship: base.fetter,
				active_constellations: base.actived_constellation_num,
				selected: base.is_chosen,
				weapon_type: _weapon_type(base.weapon_type),
				weapon: {
					id: character.weapon.id,
					name: character.weapon.name,
					icon: character.weapon.icon,
					rarity: character.weapon.rarity,
					level: character.weapon.level,
					refinement: character.weapon.affix_level,
					ascension: character.weapon.promote_level,
					description: character.weapon.desc,
					main_stat: property_value(character.weapon.main_property),
					sub_stat: character.weapon.sub_property ? property_value(character.weapon.sub_property) : null,
					wiki_url: raw.weapon_wiki[String(character.weapon.id)] ?? null,
				},
				costumes: character.costumes.map((costume) => ({
					id: costume.id,
					name: costume.name,
					icon: costume.icon,
				})),
				artifacts: character.relics.map((artifact) => ({
					id: artifact.id,
					name: artifact.name,
					icon: artifact.icon,
					position: artifact.pos,
					position_name: artifact.pos_name,
					rarity: artifact.rarity,
					level: artifact.level,
					set: {
						id: artifact.set.id,
						name: artifact.set.name,
						effects: artifact.set.affixes.map((effect) => ({
							required_pieces: effect.activation_number,
							effect: effect.effect,
							active: (set_counts.get(artifact.set.id) ?? 0) >= effect.activation_number,
						})),
					},
					main_stat: artifact_stat(artifact.main_property),
					sub_stats: artifact.sub_property_list.map(artifact_stat),
					wiki_url: raw.relic_wiki[String(artifact.id)] ?? null,
				})),
				constellations: character.constellations.map((constellation) => ({
					id: constellation.id,
					name: constellation.name,
					icon: constellation.icon,
					position: constellation.pos,
					effect: constellation.effect,
					activated: constellation.is_actived,
					enhanced: constellation.is_enhanced,
					enhanced_effect: constellation.enhanced_effect,
					can_be_enhanced: constellation.can_enhanced,
				})),
				skills: character.skills.map((skill) => ({
					id: skill.skill_id,
					type: skill.skill_type,
					name: skill.name,
					level: skill.level,
					description: skill.desc,
					affixes: skill.skill_affix_list,
					icon: skill.icon,
					unlocked: skill.is_unlock,
					enhanced: skill.is_enhanced,
					enhanced_description: skill.enhanced_desc,
					can_be_enhanced: skill.can_enhanced,
				})),
				base_properties: character.base_properties.map(property_value),
				selected_properties: character.selected_properties.map(property_value),
				extra_properties: character.extra_properties.map(property_value),
				element_properties: character.element_properties.map(property_value),
				wiki_url: raw.avatar_wiki[String(base.id)] ?? null,
			});
		});
	} catch (cause) {
		throw new TeyvatResponseValidationError('POST', ENDPOINT, [String(cause)], { cause });
	}
}
