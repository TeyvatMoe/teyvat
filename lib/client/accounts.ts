import { _get_hoyolab_game_roles } from '../endpoints/hoyolab/accounts.ts';
import { _recognize_genshin_server } from '../utils/uid.ts';
import { _set_account_details } from './account/index.ts';
import { TeyvatResponseValidationError } from './errors.ts';
import { getHttpClient } from './request.ts';
import type { Teyvat } from './teyvat.ts';

export async function _get_accounts(teyvat: Teyvat) {
	const data = await _get_hoyolab_game_roles(getHttpClient(teyvat));
	return data.list.map((role) => {
		const uid = Number(role.game_uid);
		const server = _recognize_genshin_server(uid);
		if (role.region !== server) {
			throw new TeyvatResponseValidationError('GET', '/binding/api/getUserGameRolesByCookie', [
				`region must be ${server} for UID ${uid} (was ${role.region})`,
			]);
		}
		const account = teyvat.account(uid);
		_set_account_details(account, {
			nickname: role.nickname,
			serverName: role.region_name,
			level: role.level,
			isSelected: role.is_chosen,
			isOfficial: role.is_official,
		});
		return account;
	});
}
