import { and, eq, inArray, lt, or, sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { cosmetics, guilds, mediaCleanupQueue, profiles } from '#lib/server/db/schema';
import { deleteObject, listStoredObjects } from '#lib/server/storage';

/**
 * Durable media cleanup: replaced and orphaned objects are queued in Postgres
 * before anything is deleted, every deletion is re-verified against the live
 * database references, and failed deletions are retried on the next run instead
 * of being silently lost.
 */

const MAX_ATTEMPTS = 5;
const MAX_QUEUE_BATCH = 25;
const MAX_ORPHAN_BATCH = 500;

/** Enqueue keys for deletion. Unique keys make this idempotent; a previously
 * failed row is requeued by the upsert so a manual retry always works. */
export async function enqueueMediaCleanup(keys: readonly string[]): Promise<number> {
	const candidates = keys.filter((key) => key && !key.startsWith('static/'));
	if (candidates.length === 0) return 0;

	const inserted = await db
		.insert(mediaCleanupQueue)
		.values(candidates.map((objectKey) => ({ objectKey })))
		.onConflictDoUpdate({
			target: mediaCleanupQueue.objectKey,
			set: { status: 'pending', updatedAt: new Date() }
		})
		.returning({ objectKey: mediaCleanupQueue.objectKey });
	return inserted.length;
}

/** The live set of object keys every active record still references. */
async function collectReferencedKeys(filter?: string[]): Promise<Set<string>> {
	const referenced = new Set<string>();

	const [profileRows, guildRows, cosmeticRows] = await Promise.all([
		db
			.select({
				avatarKey: profiles.avatarKey,
				bannerKey: profiles.bannerKey,
				audioKey: profiles.audioKey,
				cursorKey: profiles.cursorKey,
				backgroundKey: profiles.backgroundKey
			})
			.from(profiles)
			.where(
				filter
					? or(
							inArray(profiles.avatarKey, filter),
							inArray(profiles.bannerKey, filter),
							inArray(profiles.audioKey, filter),
							inArray(profiles.cursorKey, filter),
							inArray(profiles.backgroundKey, filter)
						)
					: undefined
			),
		db
			.select({ iconKey: guilds.iconKey, bannerKey: guilds.bannerKey })
			.from(guilds)
			.where(filter ? or(inArray(guilds.iconKey, filter), inArray(guilds.bannerKey, filter)) : undefined),
		db
			.select({ assetKey: cosmetics.assetKey })
			.from(cosmetics)
			.where(filter ? inArray(cosmetics.assetKey, filter) : undefined)
	]);

	for (const row of profileRows) {
		for (const value of [row.avatarKey, row.bannerKey, row.audioKey, row.cursorKey, row.backgroundKey]) {
			if (value) referenced.add(value);
		}
	}
	for (const row of guildRows) {
		for (const value of [row.iconKey, row.bannerKey]) {
			if (value) referenced.add(value);
		}
	}
	for (const row of cosmeticRows) {
		if (row.assetKey) referenced.add(row.assetKey);
	}

	return referenced;
}

/**
 * Process pending deletion jobs. Every key is re-checked against the live
 * references first, so a key that raced back into the database between the
 * replacement and the queue run is kept instead of deleted. Failures bump the
 * attempt counter and retry on the next run; after MAX_ATTEMPTS the row parks
 * as failed for an administrator to inspect.
 */
export async function processMediaCleanupQueue(): Promise<void> {
	const jobs = await db
		.select({ id: mediaCleanupQueue.id, objectKey: mediaCleanupQueue.objectKey, attempts: mediaCleanupQueue.attempts })
		.from(mediaCleanupQueue)
		.where(and(eq(mediaCleanupQueue.status, 'pending'), lt(mediaCleanupQueue.attempts, MAX_ATTEMPTS)))
		.orderBy(mediaCleanupQueue.createdAt)
		.limit(MAX_QUEUE_BATCH);

	if (jobs.length === 0) return;

	const referenced = await collectReferencedKeys(jobs.map((job) => job.objectKey));

	for (const job of jobs) {
		try {
			if (referenced.has(job.objectKey)) {
				// Something re-referenced this key: keep it, and retire the job.
				await db
					.update(mediaCleanupQueue)
					.set({ status: 'done', lastError: 'kept: still referenced', updatedAt: new Date() })
					.where(eq(mediaCleanupQueue.id, job.id));
				continue;
			}

			await deleteObject(job.objectKey);
			await db
				.update(mediaCleanupQueue)
				.set({ status: 'done', updatedAt: new Date() })
				.where(eq(mediaCleanupQueue.id, job.id));
		} catch (err) {
			const attempts = job.attempts + 1;
			const failed = attempts >= MAX_ATTEMPTS;
			await db
				.update(mediaCleanupQueue)
				.set({
					attempts,
					status: failed ? 'failed' : 'pending',
					lastError: err instanceof Error ? err.message : String(err),
					updatedAt: new Date()
				})
				.where(eq(mediaCleanupQueue.id, job.id));
			console.error('Media cleanup job failed', job.objectKey, err);
		}
	}
}

export type MediaStorageReport = {
	totalObjects: number;
	totalBytes: number;
	bytesByCategory: Record<string, number>;
	largest: Array<{ key: string; sizeBytes: number }>;
	queue: { pending: number; failed: number; done: number };
	orphanCandidates: string[];
};

/**
 * Dry-run storage report: totals, usage by category, largest assets, cleanup
 * queue state and objects that nothing in the database references. Orphans are
 * only ever reported here; deleting them goes through enqueueMediaCleanup,
 * where each key is verified again before deletion.
 */
export async function buildMediaReport(): Promise<MediaStorageReport> {
	const [objects, referenced, queueRows] = await Promise.all([
		listStoredObjects(),
		collectReferencedKeys(),
		db
			.select({ status: mediaCleanupQueue.status, count: sql<number>`count(*)`.mapWith(Number) })
			.from(mediaCleanupQueue)
			.groupBy(mediaCleanupQueue.status)
	]);

	const bytesByCategory: Record<string, number> = {};
	let totalBytes = 0;
	for (const object of objects) {
		const category = object.key.split('/')[0] || 'other';
		bytesByCategory[category] = (bytesByCategory[category] ?? 0) + object.sizeBytes;
		totalBytes += object.sizeBytes;
	}

	const largest = [...objects].sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 10);

	const orphanCandidates = objects
		.filter((object) => !object.key.startsWith('static/') && !referenced.has(object.key))
		.map((object) => object.key);

	const queue = { pending: 0, failed: 0, done: 0 };
	for (const row of queueRows) {
		if (row.status === 'pending' || row.status === 'failed' || row.status === 'done') {
			queue[row.status] = row.count;
		}
	}

	return {
		totalObjects: objects.length,
		totalBytes,
		bytesByCategory,
		largest,
		queue,
		orphanCandidates: orphanCandidates.slice(0, MAX_ORPHAN_BATCH)
	};
}