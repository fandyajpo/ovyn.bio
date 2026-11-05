import { describe, expect, it } from 'vitest';
import { cn, formatIdr } from '../utils';

describe('cn', () => {
	it('joins truthy parts with spaces', () => {
		expect(cn('a', 'b')).toBe('a b');
	});

	it('skips falsy parts', () => {
		expect(cn('a', false, null, undefined, 'b')).toBe('a b');
		expect(cn()).toBe('');
	});
});

describe('formatIdr', () => {
	it('formats an IDR amount with Indonesian separators', () => {
		const formatted = formatIdr(1_234_567);
		expect(formatted.startsWith('Rp')).toBe(true);
		expect(formatted.replace(/\s/g, '')).toContain('1.234.567');
	});
});