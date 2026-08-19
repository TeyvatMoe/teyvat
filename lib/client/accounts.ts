import { _get_hoyolab_game_roles } from '../endpoints/hoyolab/accounts.ts';
import { _recognize_genshin_server } from '../utils/uid.ts';
import { _set_account_details } from './account/index.ts';
import { TeyvatResponseValidationError } from './errors.ts';
import { _get_http_client } from './request.ts';
import type { Teyvat } from './teyvat.ts';

export async function _get_accounts(teyvat: Teyvat) {
	const data = await _get_hoyolab_game_roles(_get_http_client(teyvat));
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
			server_name: role.region_name,
			level: role.level,
			is_selected: role.is_chosen,
			is_official: role.is_official,
		});
		return account;
	});
}
