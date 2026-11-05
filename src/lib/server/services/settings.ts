import { db } from '#lib/server/db';
import { featureFlags } from '#lib/server/db/schema';
import { ValidationError } from '../utils/errors';

/** Sign-in methods the admin can toggle from "Manage auth". */
export const FEATURE_FLAG_KEYS = [
	'auth.forgotPassword',
	'auth.credentialLogin',
	'auth.google',
	'auth.discord'
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export function isFeatureFlagKey(value: string): value is FeatureFlagKey {
	return (FEATURE_FLAG_KEYS as readonly string[]).includes(value);
}

/** Absent rows mean enabled, so a fresh database never locks anyone out. */
const DEFAULTS: Record<FeatureFlagKey, boolean> = {
	'auth.forgotPassword': true,
	'auth.credentialLogin': true,
	'auth.google': true,
	'auth.discord': true
};

const CACHE_TTL_MS = 5_000;

let cache: { flags: Record<FeatureFlagKey, boolean>; expiresAt: number } | null = null;

/** Raw read; throws when the table is missing (migration not run yet). */
export function readFeatureFlagRows() {
	return db.select({ key: featureFlags.key, enabled: featureFlags.enabled }).from(featureFlags);
}

/**
 * The flags live on nearly every sign-in attempt, so each instance keeps them
 * for a few seconds instead of querying on every request. A missing table
 * (migration pending) falls back to the defaults instead of breaking sign-in.
 */
export async function getFeatureFlags(): Promise<Record<FeatureFlagKey, boolean>> {
	if (cache && cache.expiresAt > Date.now()) return cache.flags;

	const flags: Record<FeatureFlagKey, boolean> = { ...DEFAULTS };
	try {
		const rows = await readFeatureFlagRows();
		for (const row of rows) {
			if (isFeatureFlagKey(row.key)) flags[row.key] = row.enabled;
		}
	} catch (err) {
		console.error('Feature flags unavailable - falling back to defaults', err);
	}

	cache = { flags, expiresAt: Date.now() + CACHE_TTL_MS };
	return flags;
}

export async function setFeatureFlag(key: FeatureFlagKey, enabled: boolean, updatedBy?: string): Promise<void> {
	await db
		.insert(featureFlags)
		.values({ key, enabled, updatedBy: updatedBy ?? null, updatedAt: new Date() })
		.onConflictDoUpdate({
			target: featureFlags.key,
			set: { enabled, updatedBy: updatedBy ?? null, updatedAt: new Date() }
		});
	cache = null;
}

export async function getFeatureFlag(key: FeatureFlagKey): Promise<boolean> {
	const flags = await getFeatureFlags();
	return flags[key];
}