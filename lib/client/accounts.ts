import { _getHoyolabGameRoles } from '#/endpoints/hoyolab/accounts.ts';
import { _recognizeGenshinServer } from '#/utils/uid.ts';
import { _setAccountDetails } from './account/index.ts';
import { TeyvatResponseValidationError } from './errors.ts';
import { _getHttpClient } from './request.ts';
import type { Teyvat } from './teyvat.ts';

export async function _getAccounts(teyvat: Teyvat) {
	const data = await _getHoyolabGameRoles(_getHttpClient(teyvat));
	return data.list.map((role) => {
		const uid = Number(role.game_uid);
		const server = _recognizeGenshinServer(uid);
		if (role.region !== server) {
			throw new TeyvatResponseValidationError('GET', '/binding/api/getUserGameRolesByCookie', [
				`region must be ${server} for UID ${uid} (was ${role.region})`,
			]);
		}
		const account = teyvat.account(uid);
		_setAccountDetails(account, {
			nickname: role.nickname,
			serverName: role.region_name,
			level: role.level,
			isSelected: role.is_chosen,
			isOfficial: role.is_official,
		});
		return account;
	});
}
