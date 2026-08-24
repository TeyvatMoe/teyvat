import { TeyvatResponseValidationError } from '#/client/errors.ts';
import { _getHttpClient } from '#/client/request.ts';
import { _getHoyolabProfile } from '#/endpoints/hoyolab/profile.ts';
import { schemaTeyvatProfile, type TeyvatProfile, type TeyvatProfileGender } from '#/types/profile.ts';
import type { Teyvat } from './teyvat.ts';

const ENDPOINT = '/community/painter/wapi/user/full';

function _profileGender(gender: number): TeyvatProfileGender {
	if (gender === 1) return 'male';
	if (gender === 2) return 'female';
	if (gender === 3) return 'other';
	return 'unknown';
}

export async function _getProfile(teyvat: Teyvat): Promise<TeyvatProfile> {
	const raw = await _getHoyolabProfile(_getHttpClient(teyvat));

	try {
		const info = raw.user_info;
		const level = info.level;
		const certification = info.certification;
		const hoyolabId = String(info.uid);
		if (hoyolabId !== teyvat.hoyolabId) {
			throw new TypeError(`Returned HoYoLAB ID does not match the authenticated user`);
		}

		return schemaTeyvatProfile.assert({
			hoyolabId,
			nickname: info.nickname,
			pfp: info.avatar_url,
			bio: info.introduce,
			gender: _profileGender(info.gender),
			level:
				level == null
					? null
					: {
							current: level.level,
							experience: level.exp,
							description: level.level_desc,
						},
			pendant: info.pendant,
			backgrounds: {
				mobile: info.bg_url ?? null,
				desktop: info.pc_bg_url ?? null,
			},
			certification:
				certification == null
					? null
					: {
							type: certification.type,
							description: certification.desc ?? null,
							icon: certification.icon_url ?? null,
						},
		});
	} catch (cause) {
		throw new TeyvatResponseValidationError('GET', ENDPOINT, [String(cause)], { cause });
	}
}
