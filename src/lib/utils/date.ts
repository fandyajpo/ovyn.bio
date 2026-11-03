import {
	differenceInCalendarDays,
	format,
	formatDistanceToNow,
	isAfter,
	isValid,
	parseISO
} from 'date-fns';

/** Everything the app stores as a timestamp: a Date, an ISO string, epoch ms or nothing. */
export type DateInput = Date | string | number | null | undefined;

/** A valid Date, or null for empty and unparseable input. */
export function toDate(value: DateInput): Date | null {
	if (value === null || value === undefined || value === '') return null;
	if (value instanceof Date) return isValid(value) ? value : null;
	if (typeof value === 'number') {
		const date = new Date(value);
		return isValid(date) ? date : null;
	}
	const parsed = parseISO(value);
	if (isValid(parsed)) return parsed;
	// Some legacy rows use a plain date string, which parseISO reads as UTC midnight.
	const fallback = new Date(value);
	return isValid(fallback) ? fallback : null;
}

/**
 * Timestamps are stored in UTC and shown in the visitor's own timezone, so every
 * screen formats through these helpers instead of building its own string.
 */
export function formatDate(value: DateInput, fallback = '—'): string {
	const date = toDate(value);
	return date ? format(date, 'd MMM yyyy, HH:mm') : fallback;
}

export function formatDay(value: DateInput, fallback = '—'): string {
	const date = toDate(value);
	return date ? format(date, 'd MMM yyyy') : fallback;
}

export function formatRelativeTime(value: DateInput, fallback = '—'): string {
	const date = toDate(value);
	return date ? formatDistanceToNow(date, { addSuffix: true }) : fallback;
}

/** A yyyy-MM-dd value for an `<input type="date">`, kept in UTC like the database. */
export function formatUtcDay(value: DateInput, fallback = ''): string {
	const date = toDate(value);
	return date ? date.toISOString().slice(0, 10) : fallback;
}

export function isExpired(value: DateInput, now: Date = new Date()): boolean {
	const date = toDate(value);
	return date ? !isAfter(date, now) : false;
}

/** Whole calendar days from one timestamp to another, or null when either is invalid. */
export function calendarDaysBetween(from: DateInput, to: DateInput = new Date()): number | null {
	const start = toDate(from);
	const end = toDate(to);
	return start && end ? differenceInCalendarDays(end, start) : null;
}
