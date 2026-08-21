import { _get_http_client } from '#/client/request.ts';
import { _enable_hoyolab_calculator_sync } from '#/endpoints/hoyolab/genshin/calculator.ts';
import { _enable_hoyolab_genshin_setting } from '#/endpoints/hoyolab/settings.ts';
import type { TeyvatAccount } from './account/index.ts';
import { TeyvatError } from './errors.ts';
import type { Teyvat } from './teyvat.ts';

type TeyvatAutoEnableFeature = 'battle_chronicle' | 'character_details' | 'daily_notes' | 'calculator';

interface TeyvatAutoEnableState {
	enabled: Set<TeyvatAutoEnableFeature>;
	pending: Map<TeyvatAutoEnableFeature, Promise<void>>;
}

const feature_states = new WeakMap<Teyvat, TeyvatAutoEnableState>();

async function _enable_feature(account: TeyvatAccount, feature: TeyvatAutoEnableFeature): Promise<void> {
	const client = _get_http_client(account.inst);
	if (feature === 'battle_chronicle') {
		await _enable_hoyolab_genshin_setting(client, 1);
		return;
	}
	if (feature === 'character_details') {
		await _enable_account_feature(account, 'battle_chronicle');
		await _enable_hoyolab_genshin_setting(client, 2);
		return;
	}
	if (feature === 'daily_notes') {
		await _enable_account_feature(account, 'battle_chronicle');
		await _enable_hoyolab_genshin_setting(client, 3);
		return;
	}
	await _enable_hoyolab_calculator_sync(client);
}

export async function _enable_account_feature(
	account: TeyvatAccount,
	feature: TeyvatAutoEnableFeature,
	cause?: unknown,
): Promise<void> {
	const owned = (await account.inst.accounts()).some((candidate) => candidate.uid === account.uid);
	if (!owned) {
		throw new TeyvatError('Cannot enable a HoYoLAB feature for an account not bound to these cookies', {
			cause,
		});
	}

	let state = feature_states.get(account.inst);
	if (!state) {
		state = { enabled: new Set(), pending: new Map() };
		feature_states.set(account.inst, state);
	}
	if (state.enabled.has(feature)) return;
	const pending = state.pending.get(feature);
	if (pending) return await pending;

	const enabling = _enable_feature(account, feature)
		.then(() => {
			state.enabled.add(feature);
		})
		.finally(() => {
			if (state.pending.get(feature) === enabling) state.pending.delete(feature);
		});
	state.pending.set(feature, enabling);
	await enabling;
}
