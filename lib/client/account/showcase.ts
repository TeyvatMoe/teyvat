import { _enable_account_feature } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _get_http_client } from '#/client/request.ts';
import {
	_get_hoyolab_genshin_character_list,
	_set_hoyolab_genshin_showcase,
} from '#/endpoints/hoyolab/genshin/characters.ts';
import {
	schema_teyvat_account_showcase_character,
	type TeyvatAccountShowcaseCharacter,
} from '#/types/account/showcase.ts';
import { _character_element, _character_ids, _weapon_type } from '#/utils/character.ts';
import { _sleep } from '#/utils/misc.ts';
import type { TeyvatAccount } from './index.ts';

const LIST_ENDPOINT = '/event/game_record/genshin/api/character/list';
const TOP_ENDPOINT = '/event/game_record/genshin/api/character/top';
const ENABLE_RETRY_DELAYS = [250, 500, 1_000, 2_000] as const;
const PROPAGATION_RETRY_DELAYS = [250, 500, 1_000, 2_000] as const;

function _is_private(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

async function _character_list(account: TeyvatAccount) {
	const client = _get_http_client(account.inst);
	try {
		return await _get_hoyolab_genshin_character_list(client, account.uid, account.server);
	} catch (cause) {
		if (!(account.inst.auto_enable && _is_private(cause))) throw cause;
		await _enable_account_feature(account, 'character_details', cause);
		let retry_error: TeyvatApiError = cause;
		for (const delay of ENABLE_RETRY_DELAYS) {
			await _sleep(delay);
			try {
				return await _get_hoyolab_genshin_character_list(client, account.uid, account.server);
			} catch (retry_cause) {
				if (!_is_private(retry_cause)) throw retry_cause;
				retry_error = retry_cause;
			}
		}
		throw retry_error;
	}
}

function _map_showcase(
	list: Awaited<ReturnType<typeof _get_hoyolab_genshin_character_list>>['list'],
): TeyvatAccountShowcaseCharacter[] {
	try {
		return list
			.filter((character) => character.is_chosen)
			.map((character) =>
				schema_teyvat_account_showcase_character.assert({
					id: character.id,
					name: character.name,
					element: _character_element(character.element),
					rarity: character.rarity > 100 ? character.rarity - 100 : character.rarity,
					icon: character.icon,
					side_icon: character.side_icon,
					display_image: character.image,
					level: character.level,
					friendship: character.fetter,
					active_constellations: character.actived_constellation_num,
					weapon_type: _weapon_type(character.weapon_type),
				}),
			);
	} catch (cause) {
		throw new TeyvatResponseValidationError('POST', LIST_ENDPOINT, [String(cause)], { cause });
	}
}

function _same_ids(actual: number[], expected: number[]): boolean {
	if (actual.length !== expected.length) return false;
	const expected_ids = new Set(expected);
	return actual.every((id) => expected_ids.has(id));
}

export async function _get_account_showcase(account: TeyvatAccount): Promise<TeyvatAccountShowcaseCharacter[]> {
	return _map_showcase((await _character_list(account)).list);
}

export async function _set_account_showcase(
	account: TeyvatAccount,
	character_ids: number[],
): Promise<TeyvatAccountShowcaseCharacter[]> {
	const ids = _character_ids(character_ids);
	if (ids.length > 8) throw new TeyvatError('A Genshin showcase cannot contain more than eight characters');

	const bound = (await account.inst.accounts()).some((candidate) => candidate.uid === account.uid);
	if (!bound) throw new TeyvatError('Cannot change the showcase of an account not bound to these cookies');

	const list = await _character_list(account);
	const owned_ids = new Set(list.list.map((character) => character.id));
	if (ids.some((id) => !owned_ids.has(id)))
		throw new TeyvatError('A Genshin showcase can contain only characters owned by the account');

	await _set_hoyolab_genshin_showcase(_get_http_client(account.inst), account.uid, account.server, ids);
	for (const delay of PROPAGATION_RETRY_DELAYS) {
		await _sleep(delay);
		const showcase = _map_showcase((await _character_list(account)).list);
		if (
			_same_ids(
				showcase.map((character) => character.id),
				ids,
			)
		)
			return showcase;
	}

	throw new TeyvatResponseValidationError('POST', TOP_ENDPOINT, [
		'The updated showcase did not become visible before the propagation timeout',
	]);
}
