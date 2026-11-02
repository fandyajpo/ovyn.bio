import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { AppError } from './errors';

/**
 * Fixed-window rate limiter shared through Postgres, so every serverless
 * instance counts the same requests. Sensitive endpoints (checkout, uploads,
 * circle mutations) call `await rateLimit` with a per-user key and fail closed
 * with a 429.
 *
 * If the database cannot be reached, a per-instance memory window takes over so
 * the endpoint keeps working instead of failing on the limiter itself.
 */
export async function rateLimit(key: string, max: number, windowMs: number): Promise<void> {
	try {
		await sharedRateLimit(key, max, windowMs);
	} catch (err) {
		if (err instanceof AppError) throw err;
		console.error('Shared rate limit unavailable, using the memory window', err);
		memoryRateLimit(key, max, windowMs);
	}
}

type WindowRow = { count: number; window_start: string | Date };

async function sharedRateLimit(key: string, max: number, windowMs: number): Promise<void> {
	// One statement counts the request and opens a new window when the old one
	// has passed, so concurrent instances cannot double count.
	const window = `${windowMs} milliseconds`;
	const rows = (await db.execute(sql`
		INSERT INTO rate_limits (key, count, window_start, expires_at)
		VALUES (${key}, 1, now(), now() + ${window}::interval)
		ON CONFLICT (key) DO UPDATE SET
			count = CASE
				WHEN rate_limits.window_start + ${window}::interval <= now() THEN 1
				ELSE rate_limits.count + 1
			END,
			window_start = CASE
				WHEN rate_limits.window_start + ${window}::interval <= now() THEN now()
				ELSE rate_limits.window_start
			END,
			expires_at = GREATEST(rate_limits.expires_at, now() + ${window}::interval)
		RETURNING count, window_start
	`)) as unknown as WindowRow[];

	const row = rows[0];
	if (!row) return;

	if (Number(row.count) <= max) {
		purgeExpiredWindows();
		return;
	}

	const startedAt = row.window_start instanceof Date ? row.window_start.getTime() : new Date(row.window_start).getTime();
	const seconds = Math.max(1, Math.ceil((startedAt + windowMs - Date.now()) / 1000));
	throw new AppError(429, `Too many requests. Try again in ${seconds}s.`);
}

let purgedAt = 0;

/** Closed windows are only kept for a day, so a busy app does not grow forever. */
function purgeExpiredWindows(): void {
	const now = Date.now();
	if (now - purgedAt < 60_000) return;
	purgedAt = now;
	void (async () => {
		try {
			await db.execute(sql`DELETE FROM rate_limits WHERE expires_at < now() - interval '1 day'`);
		} catch (err) {
			console.error('Could not purge expired rate limits', err);
		}
	})();
}

const buckets = new Map<string, { count: number; resetAt: number }>();

const MAX_BUCKETS = 10_000;

/** Fallback window for when the database cannot be reached. */
function memoryRateLimit(key: string, max: number, windowMs: number): void {
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
