import { TeyvatApiError, TeyvatError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _get_http_client, type TeyvatHttpClient } from '#/client/request.ts';
import {
	_calculate_hoyolab_progression,
	_enable_hoyolab_calculator_sync,
	_get_hoyolab_calculator_character,
	_get_hoyolab_calculator_characters,
} from '#/endpoints/hoyolab/genshin/calculator.ts';
import {
	schema_teyvat_calculator_character_details,
	schema_teyvat_calculator_characters,
	schema_teyvat_calculator_result,
	type TeyvatCalculatorAccessOptions,
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

type LevelInput = { id: number; current_level: number; target_level: number };

function _mapping_error(method: string, endpoint: string, cause: unknown): TeyvatResponseValidationError {
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

function _element_id(value: TeyvatCharacterElement | undefined): number | undefined {
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

function _weapon_type(value: number): TeyvatWeaponType {
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

function _level_input(value: LevelInput, name: string): LevelInput {
	const id = _id(value.id, `${name} ID`);
	if (!Number.isSafeInteger(value.current_level) || value.current_level < 0)
		throw new TeyvatError(`${name} current_level must be a nonnegative safe integer`);
	if (!Number.isSafeInteger(value.target_level) || value.target_level < value.current_level)
		throw new TeyvatError(`${name} target_level must be a safe integer greater than or equal to current_level`);
	return { id, current_level: value.current_level, target_level: value.target_level };
}

function _unique_inputs(values: LevelInput[] | undefined, name: string): LevelInput[] {
	const unique = new Map<number, LevelInput>();
	for (const value of values ?? []) {
		const normalized = _level_input(value, name);
		if (!unique.has(normalized.id)) unique.set(normalized.id, normalized);
	}
	return [...unique.values()];
}

export class _TeyvatCalculatorClient implements TeyvatCalculatorClient {
	readonly #account: TeyvatAccount;
	readonly #client: TeyvatHttpClient;

	constructor(account: TeyvatAccount) {
		this.#account = account;
		this.#client = _get_http_client(account.inst);
	}

	async characters(options: TeyvatCalculatorAccessOptions = {}): Promise<TeyvatCalculatorCharacter[]> {
		const raw = await this.#with_sync(
			async () => await _get_hoyolab_calculator_characters(this.#client, this.#account.uid, this.#account.server),
			options.auto_enable,
		);
		try {
			return schema_teyvat_calculator_characters.assert(
				raw.list.map((character) => ({
					id: character.id,
					name: character.name,
					icon: character.icon,
					rarity: character.avatar_level,
					element: _element(character.element_attr_id),
					weapon_type: _weapon_type(character.weapon_cat_id),
					current_level: character.level_current,
					maximum_level: character.max_level,
				})),
			);
		} catch (cause) {
			throw _mapping_error('POST', LIST_ENDPOINT, cause);
		}
	}

	async character(
		id: number,
		options: TeyvatCalculatorAccessOptions = {},
	): Promise<TeyvatCalculatorCharacterDetails> {
		const character_id = _id(id, 'Calculator character ID');
		const raw = await this.#with_sync(
			async () =>
				await _get_hoyolab_calculator_character(
					this.#client,
					this.#account.uid,
					this.#account.server,
					character_id,
				),
			options.auto_enable,
		);
		try {
			return schema_teyvat_calculator_character_details.assert({
				weapon: {
					id: raw.weapon.id,
					name: raw.weapon.name,
					icon: raw.weapon.icon,
					rarity: raw.weapon.weapon_level,
					type: _weapon_type(raw.weapon.weapon_cat_id),
					current_level: raw.weapon.level_current,
					maximum_level: raw.weapon.max_level,
				},
				talents: raw.skill_list
					.filter((talent) => talent.max_level > 1)
					.map((talent) => ({
						id: talent.group_id,
						name: talent.name,
						icon: talent.icon,
						current_level: talent.level_current,
						maximum_level: talent.max_level,
					})),
				artifacts: raw.reliquary_list.map((artifact) => ({
					id: artifact.id,
					name: artifact.name,
					icon: artifact.icon,
					rarity: artifact.reliquary_level,
					position: artifact.reliquary_cat_id,
					current_level: artifact.level_current,
					maximum_level: artifact.max_level,
				})),
			});
		} catch (cause) {
			throw _mapping_error('GET', DETAIL_ENDPOINT, cause);
		}
	}

	async calculate(options: TeyvatCalculatorOptions): Promise<TeyvatCalculatorResult> {
		const character = _level_input(options.character, 'Character');
		const weapon = options.weapon ? _level_input(options.weapon, 'Weapon') : undefined;
		const talents = _unique_inputs(options.talents, 'Talent');
		const artifacts = _unique_inputs(options.artifacts, 'Artifact');
		const calculation = {
			avatar_id: character.id,
			avatar_level_current: character.current_level,
			avatar_level_target: character.target_level,
			...(_element_id(options.character.element) === undefined
				? {}
				: { element_attr_id: _element_id(options.character.element) }),
			...(weapon
				? { weapon: { id: weapon.id, level_current: weapon.current_level, level_target: weapon.target_level } }
				: {}),
			skill_list: talents.map((talent) => ({
				id: talent.id,
				level_current: talent.current_level,
				level_target: talent.target_level,
			})),
			reliquary_list: artifacts.map((artifact) => ({
				id: artifact.id,
				level_current: artifact.current_level,
				level_target: artifact.target_level,
			})),
		};
		const raw = await this.#with_sync(
			async () =>
				await _calculate_hoyolab_progression(
					this.#client,
					this.#account.uid,
					this.#account.server,
					calculation,
				),
			options.auto_enable,
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
				wiki_url: value.wiki_url || null,
				required: value.num,
				owned: owned.get(value.id) ?? 0,
				missing: Math.max(0, value.num - (owned.get(value.id) ?? 0)),
			});

			return schema_teyvat_calculator_result.assert({
				character: result.avatar_consume.map(material),
				weapon: result.weapon_consume.map(material),
				talents: result.skills_consume.map((talent) => ({
					id: talent.skill_info.id,
					current_level: talent.skill_info.level_current,
					target_level: talent.skill_info.level_target,
					materials: talent.consume_list.map(material),
				})),
				artifacts: result.reliquary_consume.map((artifact) => ({
					id: artifact.reliquary_id,
					materials: artifact.id_consume_list.map(material),
				})),
				total: raw.overall_consume.map(material),
				lineup_recommendation: result.lineup_recommend || null,
			});
		} catch (cause) {
			throw _mapping_error('POST', CALCULATE_ENDPOINT, cause);
		}
	}

	async #with_sync<T>(request: () => Promise<T>, auto_enable = false): Promise<T> {
		try {
			return await request();
		} catch (cause) {
			if (!(auto_enable && cause instanceof TeyvatApiError && cause.retcode === -502002)) throw cause;
			const owned = (await this.#account.inst.accounts()).some((account) => account.uid === this.#account.uid);
			if (!owned)
				throw new TeyvatError('Cannot enable calculator sync for an account not bound to these cookies', {
					cause,
				});
			await _enable_hoyolab_calculator_sync(this.#client);
			return await request();
		}
	}
}
