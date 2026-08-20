import { type } from 'arktype';

const schema_currency = type.enumerated('primogems', 'mora');
/** @category Traveler's Diary */
export type TeyvatTravelerDiaryCurrency = typeof schema_currency.infer;

/** @category Traveler's Diary */
export interface TeyvatTravelerDiaryOptions {
	month?: number;
}

/** @category Traveler's Diary */
export interface TeyvatTravelerDiaryLogOptions extends TeyvatTravelerDiaryOptions {
	currency?: TeyvatTravelerDiaryCurrency;
	limit?: number;
}

const schema_source = type({
	id: 'number.integer',
	name: 'string',
	amount: 'number.integer >= 0',
	percentage: 'number.integer >= 0',
});

export const schema_teyvat_account_traveler_diary = type({
	month: 'number.integer >= 1',
	available_months: type('number.integer >= 1').array(),
	primogems: {
		current_month: 'number.integer >= 0',
		previous_month: 'number.integer >= 0',
		change_percentage: 'number.integer',
		today: 'number.integer >= 0',
		sources: schema_source.array(),
	},
	mora: {
		current_month: 'number.integer >= 0',
		previous_month: 'number.integer >= 0',
		change_percentage: 'number.integer',
		today: 'number.integer >= 0',
	},
});

export const schema_teyvat_traveler_diary_entry = type({
	id: 'number.integer',
	name: 'string',
	earned_at: 'Date',
	amount: 'number.integer >= 0',
});

/**
 * @interface
 * @useDeclaredType
 * @category Traveler's Diary
 */
export type TeyvatAccountTravelerDiary = typeof schema_teyvat_account_traveler_diary.infer;

/**
 * @interface
 * @useDeclaredType
 * @category Traveler's Diary
 */
export type TeyvatTravelerDiaryEntry = typeof schema_teyvat_traveler_diary_entry.infer;
