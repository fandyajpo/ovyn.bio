/**
 * Tiny in-process TTL cache with insertion-order eviction. Each serverless
 * instance keeps its own copy, which is exactly right for softening hot queries
 * (the sitemap, presigned URLs) that a CDN cannot fully absorb.
 */
export class TtlCache<T> {
	private readonly entries = new Map<string, { value: T; expiresAt: number }>();

	constructor(
		private readonly ttlMs: number,
		private readonly maxEntries = 100
	) {}

	get(key: string): T | undefined {
		const hit = this.entries.get(key);
		if (!hit) return undefined;
		if (hit.expiresAt <= Date.now()) {
			this.entries.delete(key);
			return undefined;
		}
		return hit.value;
	}

	set(key: string, value: T): void {
		// Re-setting an existing key moves it to the newest position, so the first
		// key in the Map is always the oldest one when eviction is needed.
		this.entries.delete(key);
		this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });

		if (this.entries.size > this.maxEntries) {
			const oldest = this.entries.keys().next().value;
			if (oldest !== undefined) this.entries.delete(oldest);
		}
	}
}