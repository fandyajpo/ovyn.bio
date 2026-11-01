import { AppError } from './errors';

/**
 * Fixed-window in-memory rate limiter.
 *
 * Good enough to blunt abuse; on serverless each instance has its own window.
 * Sensitive endpoints (checkout, uploads, guild mutations) call `rateLimit`
 * with a per-user key and fail closed with 429.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

const MAX_BUCKETS = 10_000;

export function rateLimit(key: string, max: number, windowMs: number): void {
	const now = Date.now();

	if (buckets.size > MAX_BUCKETS) {
		for (const [k, v] of buckets) {
			if (v.resetAt < now) buckets.delete(k);
		}
	}

	const bucket = buckets.get(key);
	if (!bucket || bucket.resetAt < now) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return;
	}

	bucket.count += 1;
	if (bucket.count > max) {
		const seconds = Math.ceil((bucket.resetAt - now) / 1000);
		throw new AppError(429, `Too many requests. Try again in ${seconds}s.`);
	}
}
