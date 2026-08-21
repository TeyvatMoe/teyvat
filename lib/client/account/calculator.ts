import { _enableAccountFeature } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _getHttpClient, type TeyvatHttpClient } from '#/client/request.ts';
import {
	_calculateHoyolabProgression,
	_getHoyolabCalculatorCharacter,
	_getHoyolabCalculatorCharacters,
} from '#/endpoints/hoyolab/genshin/calculator.ts';
import {
	schemaTeyvatCalculatorCharacterDetails,
	schemaTeyvatCalculatorCharacters,
	schemaTeyvatCalculatorResult,
	type TeyvatCalculatorCharacter,
	type TeyvatCalculatorCharacterDetails,
	type TeyvatCalculatorClient,
	type TeyvatCalculatorOptions,
	type TeyvatCalculatorResult,
} from '#/types/account/calculator.ts';
import type { TeyvatCharacterElement, TeyvatWeaponType } from '#/types/account/character.ts';
import type { TeyvatAccount } from './index.ts';

const LIST_ENDPOINT = '/event/e20200928calculate/v1/sync/avatar/list';
const DETAIL_ENDPOINT = '/event/e20200928calculate/v1/sync/avatar/detail';
const CALCULATE_ENDPOINT = '/event/e20200928calculate/v3/batch_compute';

type LevelInput = { id: number; currentLevel: number; targetLevel: number };

function _mappingError(method: string, endpoint: string, cause: unknown): TeyvatResponseValidationError {
	return new TeyvatResponseValidationError(
		method,
		endpoint,
		[cause instanceof Error ? cause.message : String(cause)],
		{ cause },
	);
}

function _element(value: number): TeyvatCharacterElement {
	if (value === 1) return 'pyro';
	if (value === 2) return 'anemo';
	if (value === 3) return 'geo';
	if (value === 4) return 'dendro';
	if (value === 5) return 'electro';
	if (value === 6) return 'hydro';
	if (value === 7) return 'cryo';
	throw new TypeError(`Unknown calculator element code: ${value}`);
}

function _elementId(value: TeyvatCharacterElement | undefined): number | undefined {
	if (value === undefined) return undefined;
	if (value === 'pyro') return 1;
	if (value === 'anemo') return 2;
	if (value === 'geo') return 3;
	if (value === 'dendro') return 4;
	if (value === 'electro') return 5;
	if (value === 'hydro') return 6;
	if (value === 'cryo') return 7;
	throw new TeyvatError('Calculator character element must be a supported Genshin element');
}

function _weaponType(value: number): TeyvatWeaponType {
	if (value === 1) return 'sword';
	if (value === 10) return 'catalyst';
	if (value === 11) return 'claymore';
	if (value === 12) return 'bow';
	if (value === 13) return 'polearm';
	throw new TypeError(`Unknown calculator weapon type code: ${value}`);
}

function _id(value: unknown, name: string): number {
	if (!Number.isSafeInteger(value) || Number(value) <= 0)
		throw new TeyvatError(`${name} must be a positive safe integer`);
	return Number(value);
}

function _levelInput(value: LevelInput, name: string): LevelInput {
	const id = _id(value.id, `${name} ID`);
	if (!Number.isSafeInteger(value.currentLevel) || value.currentLevel < 0)
		throw new TeyvatError(`${name} currentLevel must be a nonnegative safe integer`);
	if (!Number.isSafeInteger(value.targetLevel) || value.targetLevel < value.currentLevel)
		throw new TeyvatError(`${name} targetLevel must be a safe integer greater than or equal to currentLevel`);
	return { id, currentLevel: value.currentLevel, targetLevel: value.targetLevel };
}

function _uniqueInputs(values: LevelInput[] | undefined, name: string): LevelInput[] {
	const unique = new Map<number, LevelInput>();
	for (const value of values ?? []) {
		const normalized = _levelInput(value, name);
		if (!unique.has(normalized.id)) unique.set(normalized.id, normalized);
	}
	return [...unique.values()];
}

export class _TeyvatCalculatorClient implements TeyvatCalculatorClient {
	readonly #account: TeyvatAccount;
	readonly #client: TeyvatHttpClient;

	constructor(account: TeyvatAccount) {
		this.#account = account;
		this.#client = _getHttpClient(account.inst);
	}

	async characters(): Promise<TeyvatCalculatorCharacter[]> {
		const raw = await this.#withSync(
			async () => await _getHoyolabCalculatorCharacters(this.#client, this.#account.uid, this.#account.server),
		);
		try {
			return schemaTeyvatCalculatorCharacters.assert(
				raw.list.map((character) => ({
					id: character.id,
					name: character.name,
					icon: character.icon,
					rarity: character.avatar_level,
					element: _element(character.element_attr_id),
					weaponType: _weaponType(character.weapon_cat_id),
					currentLevel: character.level_current,
					maximumLevel: character.max_level,
				})),
			);
		} catch (cause) {
			throw _mappingError('POST', LIST_ENDPOINT, cause);
		}
	}

	async character(id: number): Promise<TeyvatCalculatorCharacterDetails> {
		const characterId = _id(id, 'Calculator character ID');
		const raw = await this.#withSync(
			async () =>
				await _getHoyolabCalculatorCharacter(
					this.#client,
					this.#account.uid,
					this.#account.server,
					characterId,
				),
		);
		try {
			return schemaTeyvatCalculatorCharacterDetails.assert({
				weapon: {
					id: raw.weapon.id,
					name: raw.weapon.name,
					icon: raw.weapon.icon,
					rarity: raw.weapon.weapon_level,
					type: _weaponType(raw.weapon.weapon_cat_id),
					currentLevel: raw.weapon.level_current,
					maximumLevel: raw.weapon.max_level,
				},
				talents: raw.skill_list
					.filter((talent) => talent.max_level > 1)
					.map((talent) => ({
						id: talent.group_id,
						name: talent.name,
						icon: talent.icon,
						currentLevel: talent.level_current,
						maximumLevel: talent.max_level,
					})),
				artifacts: raw.reliquary_list.map((artifact) => ({
					id: artifact.id,
					name: artifact.name,
					icon: artifact.icon,
					rarity: artifact.reliquary_level,
					position: artifact.reliquary_cat_id,
					currentLevel: artifact.level_current,
					maximumLevel: artifact.max_level,
				})),
			});
		} catch (cause) {
			throw _mappingError('GET', DETAIL_ENDPOINT, cause);
		}
	}

	async calculate(options: TeyvatCalculatorOptions): Promise<TeyvatCalculatorResult> {
		const character = _levelInput(options.character, 'Character');
		const weapon = options.weapon ? _levelInput(options.weapon, 'Weapon') : undefined;
		const talents = _uniqueInputs(options.talents, 'Talent');
		const artifacts = _uniqueInputs(options.artifacts, 'Artifact');
		const calculation = {
			avatarId: character.id,
			avatarLevelCurrent: character.currentLevel,
			avatarLevelTarget: character.targetLevel,
			...(_elementId(options.character.element) === undefined
				? {}
				: { elementAttrId: _elementId(options.character.element) }),
			...(weapon
				? { weapon: { id: weapon.id, levelCurrent: weapon.currentLevel, levelTarget: weapon.targetLevel } }
				: {}),
			skillList: talents.map((talent) => ({
				id: talent.id,
				levelCurrent: talent.currentLevel,
				levelTarget: talent.targetLevel,
			})),
			reliquaryList: artifacts.map((artifact) => ({
				id: artifact.id,
				levelCurrent: artifact.currentLevel,
				levelTarget: artifact.targetLevel,
			})),
		};
		const raw = await this.#withSync(
			async () =>
				await _calculateHoyolabProgression(this.#client, this.#account.uid, this.#account.server, calculation),
		);
		try {
			if (!raw.has_user_info)
				throw new TypeError('Calculator response did not include account material availability');
			const result = raw.items[0];
			if (!result) throw new TypeError('Calculator response did not contain the requested calculation');
			const owned = new Map(raw.available_material.map((material) => [material.id, material.num]));
			const material = (value: (typeof raw.overall_consume)[number]) => ({
				id: value.id,
				name: value.name,
				icon: value.icon,
				rarity: value.level,
				wikiUrl: value.wiki_url || null,
				required: value.num,
				owned: owned.get(value.id) ?? 0,
				missing: Math.max(0, value.num - (owned.get(value.id) ?? 0)),
			});

			return schemaTeyvatCalculatorResult.assert({
				character: result.avatar_consume.map(material),
				weapon: result.weapon_consume.map(material),
				talents: result.skills_consume.map((talent) => ({
					id: talent.skill_info.id,
					currentLevel: talent.skill_info.level_current,
					targetLevel: talent.skill_info.level_target,
					materials: talent.consume_list.map(material),
				})),
				artifacts: result.reliquary_consume.map((artifact) => ({
					id: artifact.reliquary_id,
					materials: artifact.id_consume_list.map(material),
				})),
				total: raw.overall_consume.map(material),
				lineupRecommendation: result.lineup_recommend || null,
			});
		} catch (cause) {
			throw _mappingError('POST', CALCULATE_ENDPOINT, cause);
		}
	}

	async #withSync<T>(request: () => Promise<T>): Promise<T> {
		try {
			return await request();
		} catch (cause) {
			if (!(this.#account.inst.autoEnable && cause instanceof TeyvatApiError && cause.retcode === -502002))
				throw cause;
			await _enableAccountFeature(this.#account, 'calculator', cause);
			return await request();
		}
	}
}
