import { TeyvatError } from '#/client/errors.ts';
import type { TeyvatCharacterElement, TeyvatWeaponType } from '#/types/account/character.ts';

export function _characterElement(element: string): TeyvatCharacterElement {
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

export function _characterIds(ids: number[]): number[] {
	const unique = new Set<number>();
	for (const id of ids) {
		if (!Number.isSafeInteger(id) || id <= 0) throw new TeyvatError('Character IDs must be positive safe integers');
		unique.add(id);
	}
	return [...unique];
}

export function _weaponType(type: number): TeyvatWeaponType {
	if (type === 1) return 'sword';
	if (type === 10) return 'catalyst';
	if (type === 11) return 'claymore';
	if (type === 12) return 'bow';
	if (type === 13) return 'polearm';
	throw new TypeError(`Unknown weapon type: ${type}`);
}
