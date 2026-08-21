import { _enableAccountFeature } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _getHttpClient } from '#/client/request.ts';
import { _getHoyolabGenshinCharacterList, _setHoyolabGenshinShowcase } from '#/endpoints/hoyolab/genshin/characters.ts';
import { schemaTeyvatAccountShowcaseCharacter, type TeyvatAccountShowcaseCharacter } from '#/types/account/showcase.ts';
import { _characterElement, _characterIds, _weaponType } from '#/utils/character.ts';
import { _sleep } from '#/utils/misc.ts';
import type { TeyvatAccount } from './index.ts';

const LIST_ENDPOINT = '/event/game_record/genshin/api/character/list';
const TOP_ENDPOINT = '/event/game_record/genshin/api/character/top';
const ENABLE_RETRY_DELAYS = [250, 500, 1_000, 2_000] as const;
const PROPAGATION_RETRY_DELAYS = [250, 500, 1_000, 2_000] as const;

function _isPrivate(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

async function _characterList(account: TeyvatAccount) {
	const client = _getHttpClient(account.inst);
	try {
		return await _getHoyolabGenshinCharacterList(client, account.uid, account.server);
	} catch (cause) {
		if (!(account.inst.autoEnable && _isPrivate(cause))) throw cause;
		await _enableAccountFeature(account, 'character_details', cause);
		let retryError: TeyvatApiError = cause;
		for (const delay of ENABLE_RETRY_DELAYS) {
			await _sleep(delay);
			try {
				return await _getHoyolabGenshinCharacterList(client, account.uid, account.server);
			} catch (retryCause) {
				if (!_isPrivate(retryCause)) throw retryCause;
				retryError = retryCause;
			}
		}
		throw retryError;
	}
}

function _mapShowcase(
	list: Awaited<ReturnType<typeof _getHoyolabGenshinCharacterList>>['list'],
): TeyvatAccountShowcaseCharacter[] {
	try {
		return list
			.filter((character) => character.is_chosen)
			.map((character) =>
				schemaTeyvatAccountShowcaseCharacter.assert({
					id: character.id,
					name: character.name,
					element: _characterElement(character.element),
					rarity: character.rarity > 100 ? character.rarity - 100 : character.rarity,
					icon: character.icon,
					sideIcon: character.side_icon,
					displayImage: character.image,
					level: character.level,
					friendship: character.fetter,
					activeConstellations: character.actived_constellation_num,
					weaponType: _weaponType(character.weapon_type),
				}),
			);
	} catch (cause) {
		throw new TeyvatResponseValidationError('POST', LIST_ENDPOINT, [String(cause)], { cause });
	}
}

function _sameOrderedIds(actual: number[], expected: number[]): boolean {
	return actual.length === expected.length && actual.every((id, index) => id === expected[index]);
}

export async function _getAccountShowcase(account: TeyvatAccount): Promise<TeyvatAccountShowcaseCharacter[]> {
	return _mapShowcase((await _characterList(account)).list);
}

export async function _setAccountShowcase(
	account: TeyvatAccount,
	requestedCharacterIds: number[],
): Promise<TeyvatAccountShowcaseCharacter[]> {
	const ids = _characterIds(requestedCharacterIds);
	if (ids.length > 12)
		throw new TeyvatError('A Battle Chronicle character showcase cannot contain more than 12 characters');

	const bound = (await account.inst.accounts()).some((candidate) => candidate.uid === account.uid);
	if (!bound) throw new TeyvatError('Cannot change the showcase of an account not bound to these cookies');

	const list = await _characterList(account);
	const ownedIds = new Set(list.list.map((character) => character.id));
	if (ids.some((id) => !ownedIds.has(id)))
		throw new TeyvatError('A Battle Chronicle character showcase can contain only characters owned by the account');

	await _setHoyolabGenshinShowcase(_getHttpClient(account.inst), account.uid, account.server, ids);
	for (const delay of PROPAGATION_RETRY_DELAYS) {
		await _sleep(delay);
		const showcase = _mapShowcase((await _characterList(account)).list);
		if (
			_sameOrderedIds(
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
