import { type } from 'arktype';

const schemaCurrency = type.enumerated('primogems', 'mora');
/** @category Traveler's Diary */
export type TeyvatTravelerDiaryCurrency = typeof schemaCurrency.infer;

/** @category Traveler's Diary */
export interface TeyvatTravelerDiaryOptions {
	month?: number;
}

/** @category Traveler's Diary */
export interface TeyvatTravelerDiaryLogOptions extends TeyvatTravelerDiaryOptions {
	currency?: TeyvatTravelerDiaryCurrency;
	limit?: number;
}

const schemaSource = type({
	id: 'number.integer',
	name: 'string',
	amount: 'number.integer >= 0',
	percentage: 'number.integer >= 0',
});

export const schemaTeyvatAccountTravelerDiary = type({
	month: 'number.integer >= 1',
	availableMonths: type('number.integer >= 1').array(),
	primogems: {
		currentMonth: 'number.integer >= 0',
		previousMonth: 'number.integer >= 0',
		changePercentage: 'number.integer',
		today: 'number.integer >= 0',
		sources: schemaSource.array(),
	},
	mora: {
		currentMonth: 'number.integer >= 0',
		previousMonth: 'number.integer >= 0',
		changePercentage: 'number.integer',
		today: 'number.integer >= 0',
	},
});

export const schemaTeyvatTravelerDiaryEntry = type({
	id: 'number.integer',
	name: 'string',
	earnedAt: 'Date',
	amount: 'number.integer >= 0',
});

/**
 * @interface
 * @useDeclaredType
 * @category Traveler's Diary
 */
export type TeyvatAccountTravelerDiary = typeof schemaTeyvatAccountTravelerDiary.infer;

/**
 * @interface
 * @useDeclaredType
 * @category Traveler's Diary
 */
export type TeyvatTravelerDiaryEntry = typeof schemaTeyvatTravelerDiaryEntry.infer;
