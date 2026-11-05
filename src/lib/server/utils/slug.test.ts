import { describe, expect, it } from 'vitest';
import { isValidSlug, normalizeSlug, RESERVED_SLUGS } from './slug';

describe('normalizeSlug', () => {
	it('lowercases and replaces runs of invalid characters', () => {
		expect(normalizeSlug('  Notain -- 99! ')).toBe('notain-99');
	});

	it('strips leading and trailing separators and dots', () => {
		expect(normalizeSlug('-._hello._-')).toBe('hello');
	});

	it('collapses repeated separators into one', () => {
		expect(normalizeSlug('a----b')).toBe('a-b');
	});

	it('falls back to an empty string when nothing survives', () => {
		expect(normalizeSlug('***')).toBe('');
	});
});

describe('isValidSlug', () => {
	it('accepts clean slugs within the length bounds', () => {
		expect(isValidSlug('notain')).toBe(true);
		expect(isValidSlug('a-b.9')).toBe(true);
		expect(isValidSlug('x'.repeat(32))).toBe(true);
	});

	it('rejects slugs outside 2-32 characters', () => {
		expect(isValidSlug('a')).toBe(false);
		expect(isValidSlug('x'.repeat(33))).toBe(false);
	});

	it('rejects leading or trailing separators', () => {
		expect(isValidSlug('-abc')).toBe(false);
		expect(isValidSlug('abc-')).toBe(false);
		expect(isValidSlug('.abc')).toBe(false);
	});

	it('rejects reserved route names', () => {
		expect(RESERVED_SLUGS.has('admin')).toBe(true);
		expect(RESERVED_SLUGS.has('login')).toBe(true);
		expect(isValidSlug('admin')).toBe(false);
		expect(isValidSlug('shop')).toBe(false);
	});

	it('rejects characters outside the slug alphabet', () => {
		expect(isValidSlug('héllo')).toBe(false);
		expect(isValidSlug('a b')).toBe(false);
	});
});