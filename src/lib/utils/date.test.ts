import { describe, expect, it } from 'vite-plus/test';
import { calendarDaysBetween, formatUtcDay, isExpired, toDate } from './date';

describe('toDate', () => {
	it('passes Date values through', () => {
		const date = new Date('2024-05-01T10:00:00Z');
		expect(toDate(date)?.getTime()).toBe(date.getTime());
	});

	it('parses ISO strings to the same instant', () => {
		expect(toDate('2024-05-01T10:00:00Z')?.toISOString()).toBe('2024-05-01T10:00:00.000Z');
	});

	it('reads epoch milliseconds', () => {
		expect(toDate(0)?.toISOString()).toBe('1970-01-01T00:00:00.000Z');
	});

	it('returns null for empty and unparseable input', () => {
		expect(toDate(null)).toBeNull();
		expect(toDate(undefined)).toBeNull();
		expect(toDate('')).toBeNull();
		expect(toDate('not a date')).toBeNull();
	});
});

describe('formatUtcDay', () => {
	it('keeps the UTC calendar day regardless of local timezone', () => {
		expect(formatUtcDay('2024-05-01T23:30:00Z')).toBe('2024-05-01');
	});

	it('falls back when the input is empty', () => {
		expect(formatUtcDay(null)).toBe('');
	});
});

describe('isExpired', () => {
	it('is false for future dates', () => {
		expect(isExpired('2099-01-01T00:00:00Z', new Date('2024-01-01T00:00:00Z'))).toBe(false);
	});

	it('is true for past dates', () => {
		expect(isExpired('2020-01-01T00:00:00Z', new Date('2024-01-01T00:00:00Z'))).toBe(true);
	});

	it('never expires empty input', () => {
		expect(isExpired(null)).toBe(false);
	});
});

describe('calendarDaysBetween', () => {
	it('counts calendar days between two instants', () => {
		expect(calendarDaysBetween('2024-01-01T00:00:00Z', '2024-01-04T00:00:00Z')).toBe(3);
	});

	it('returns null when either side is invalid', () => {
		expect(calendarDaysBetween(null, '2024-01-04T00:00:00Z')).toBeNull();
	});
});