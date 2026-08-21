import { _getHttpClient } from '#/client/request.ts';
import { _enableHoyolabCalculatorSync } from '#/endpoints/hoyolab/genshin/calculator.ts';
import { _enableHoyolabGenshinSetting } from '#/endpoints/hoyolab/settings.ts';
import type { TeyvatAccount } from './account/index.ts';
import { TeyvatError } from './errors.ts';
import type { Teyvat } from './teyvat.ts';

type TeyvatAutoEnableFeature = 'battle_chronicle' | 'character_details' | 'daily_notes' | 'calculator';

interface TeyvatAutoEnableState {
	enabled: Set<TeyvatAutoEnableFeature>;
	pending: Map<TeyvatAutoEnableFeature, Promise<void>>;
}

const featureStates = new WeakMap<Teyvat, TeyvatAutoEnableState>();

async function _enableFeature(account: TeyvatAccount, feature: TeyvatAutoEnableFeature): Promise<void> {
	const client = _getHttpClient(account.inst);
	if (feature === 'battle_chronicle') {
		await _enableHoyolabGenshinSetting(client, 1);
		return;
	}
	if (feature === 'character_details') {
		await _enableAccountFeature(account, 'battle_chronicle');
		await _enableHoyolabGenshinSetting(client, 2);
		return;
	}
	if (feature === 'daily_notes') {
		await _enableAccountFeature(account, 'battle_chronicle');
		await _enableHoyolabGenshinSetting(client, 3);
		return;
	}
	await _enableHoyolabCalculatorSync(client);
}

export async function _enableAccountFeature(
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

	let state = featureStates.get(account.inst);
	if (!state) {
		state = { enabled: new Set(), pending: new Map() };
		featureStates.set(account.inst, state);
	}
	if (state.enabled.has(feature)) return;
	const pending = state.pending.get(feature);
	if (pending) return await pending;

	const enabling = _enableFeature(account, feature)
		.then(() => {
			state.enabled.add(feature);
		})
		.finally(() => {
			if (state.pending.get(feature) === enabling) state.pending.delete(feature);
		});
	state.pending.set(feature, enabling);
	await enabling;
}
