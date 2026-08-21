import { _enableAccountFeature } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _getHttpClient } from '#/client/request.ts';
import {
	_getHoyolabGenshinCharacterDetails,
	_getHoyolabGenshinCharacterList,
} from '#/endpoints/hoyolab/genshin/characters.ts';
import {
	schemaTeyvatAccountCharacter,
	type TeyvatAccountCharacter,
	type TeyvatCharactersOptions,
} from '#/types/account/character.ts';
import { _characterElement, _characterIds, _weaponType } from '#/utils/character.ts';
import { _sleep } from '#/utils/misc.ts';
import type { TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/character/detail';
const ENABLE_RETRY_DELAYS = [250, 500, 1_000, 2_000] as const;

function _isCharacterDetailsPrivate(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

async function _requestCharacters(account: TeyvatAccount, ids?: number[]) {
	const client = _getHttpClient(account.inst);
	const characterIds =
		ids ?? (await _getHoyolabGenshinCharacterList(client, account.uid, account.server)).list.map(({ id }) => id);
	if (characterIds.length === 0) return undefined;
	return await _getHoyolabGenshinCharacterDetails(client, account.uid, account.server, characterIds);
}

export async function _getAccountCharacters(
	account: TeyvatAccount,
	options: TeyvatCharactersOptions = {},
): Promise<TeyvatAccountCharacter[]> {
	const ids = options.ids === undefined ? undefined : _characterIds(options.ids);
	if (ids?.length === 0) return [];

	let raw: Awaited<ReturnType<typeof _requestCharacters>>;
	try {
		raw = await _requestCharacters(account, ids);
	} catch (cause) {
		if (!(account.inst.autoEnable && _isCharacterDetailsPrivate(cause))) throw cause;
		await _enableAccountFeature(account, 'character_details', cause);
		let retryError: TeyvatApiError = cause;
		for (const delay of ENABLE_RETRY_DELAYS) {
			await _sleep(delay);
			try {
				raw = await _requestCharacters(account, ids);
				break;
			} catch (retryCause) {
				if (!_isCharacterDetailsPrivate(retryCause)) throw retryCause;
				retryError = retryCause;
			}
		}
		if (!raw) throw retryError;
	}

	if (!raw) return [];
	try {
		const propertyInfo = (propertyType: number) => {
			const info = raw.property_map[String(propertyType)];
			if (!info) throw new TypeError(`Missing property definition for property type ${propertyType}`);
			return {
				type: info.property_type,
				name: info.name.replaceAll('\u00a0', ' '),
				icon: info.icon,
				filterName: info.filter_name.replaceAll('\u00a0', ' '),
			};
		};
		const propertyValue = (property: { ['property_type']: number; base: string; add: string; final: string }) => ({
			base: property.base,
			add: property.add,
			final: property.final,
			info: propertyInfo(property.property_type),
		});
		const artifactStat = (property: { ['property_type']: number; value: string; times: number }) => ({
			value: property.value,
			times: property.times,
			info: propertyInfo(property.property_type),
		});

		return raw.list.map((character) => {
			const base = character.base;
			const rarity = base.rarity > 100 ? base.rarity - 100 : base.rarity;
			const setCounts = new Map<number, number>();
			for (const artifact of character.relics)
				setCounts.set(artifact.set.id, (setCounts.get(artifact.set.id) ?? 0) + 1);

			return schemaTeyvatAccountCharacter.assert({
				id: base.id,
				name: base.name,
				element: _characterElement(base.element),
				rarity,
				collab: base.rarity > 100 || base.id === 10000062,
				icon: base.icon,
				sideIcon: base.side_icon,
				displayImage: base.image,
				level: base.level,
				friendship: base.fetter,
				activeConstellations: base.actived_constellation_num,
				selected: base.is_chosen,
				weaponType: _weaponType(base.weapon_type),
				weapon: {
					id: character.weapon.id,
					name: character.weapon.name,
					icon: character.weapon.icon,
					rarity: character.weapon.rarity,
					level: character.weapon.level,
					refinement: character.weapon.affix_level,
					ascension: character.weapon.promote_level,
					description: character.weapon.desc,
					mainStat: propertyValue(character.weapon.main_property),
					subStat: character.weapon.sub_property ? propertyValue(character.weapon.sub_property) : null,
					wikiUrl: raw.weapon_wiki[String(character.weapon.id)] ?? null,
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
					positionName: artifact.pos_name,
					rarity: artifact.rarity,
					level: artifact.level,
					set: {
						id: artifact.set.id,
						name: artifact.set.name,
						effects: artifact.set.affixes.map((effect) => ({
							requiredPieces: effect.activation_number,
							effect: effect.effect,
							active: (setCounts.get(artifact.set.id) ?? 0) >= effect.activation_number,
						})),
					},
					mainStat: artifactStat(artifact.main_property),
					subStats: artifact.sub_property_list.map(artifactStat),
					wikiUrl: raw.relic_wiki[String(artifact.id)] ?? null,
				})),
				constellations: character.constellations.map((constellation) => ({
					id: constellation.id,
					name: constellation.name,
					icon: constellation.icon,
					position: constellation.pos,
					effect: constellation.effect,
					activated: constellation.is_actived,
					enhanced: constellation.is_enhanced,
					enhancedEffect: constellation.enhanced_effect,
					canBeEnhanced: constellation.can_enhanced,
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
					enhancedDescription: skill.enhanced_desc,
					canBeEnhanced: skill.can_enhanced,
				})),
				baseProperties: character.base_properties.map(propertyValue),
				selectedProperties: character.selected_properties.map(propertyValue),
				extraProperties: character.extra_properties.map(propertyValue),
				elementProperties: character.element_properties.map(propertyValue),
				wikiUrl: raw.avatar_wiki[String(base.id)] ?? null,
			});
		});
	} catch (cause) {
		throw new TeyvatResponseValidationError('POST', ENDPOINT, [String(cause)], { cause });
	}
}
