import { type } from 'arktype';

export const schemaTeyvatProfileGender = type.enumerated('unknown', 'male', 'female', 'other');

export const schemaTeyvatProfile = type({
	hoyolabId: 'string',
	nickname: 'string',
	pfp: 'string',
	bio: 'string',
	gender: schemaTeyvatProfileGender,
	level: type({
		current: 'number.integer >= 0',
		experience: 'number.integer >= 0',
		description: 'string',
	}).or('null'),
	pendant: 'string',
	backgrounds: {
		mobile: 'string | null',
		desktop: 'string | null',
	},
	certification: type({
		type: 'number.integer',
		description: 'string | null',
		icon: 'string | null',
	}).or('null'),
});

/**
 * Gender displayed on a HoYoLAB profile.
 *
 * @useDeclaredType
 * @category HoYoLAB Profile
 */
export type TeyvatProfileGender = typeof schemaTeyvatProfileGender.infer;

/**
 * The authenticated user's HoYoLAB profile.
 *
 * @interface
 * @useDeclaredType
 * @category HoYoLAB Profile
 */
export type TeyvatProfile = typeof schemaTeyvatProfile.infer;

/** @category HoYoLAB Profile */
export interface TeyvatProfileOptions {
	/** Request fresh profile data instead of returning the current cache entry. */
	update?: boolean;
}
