import type { Teyvat } from './teyvat.ts';

export class TeyvatAccount {
	inst: Teyvat;
	uid: number;
	constructor(inst: Teyvat, uid: number) {
		this.inst = inst;
		this.uid = uid;
	}

	async info() {}

	async characters() {}

	async daily_notes() {}

	async spiral_abyss() {}
}
