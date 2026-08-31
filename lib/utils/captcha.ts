export function _matchesGeetestV3Challenge(submitted: string, pending: string): boolean {
	return submitted === pending || (submitted.length === pending.length + 2 && submitted.startsWith(pending));
}
