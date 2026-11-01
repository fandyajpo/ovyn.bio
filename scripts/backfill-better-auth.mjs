/**
 * One-time data backfill: copies users + Discord accounts from Neon Auth's
 * managed `neon_auth` schema into the standalone Better Auth tables,
 * PRESERVING the same user ids, so existing profiles, guild memberships,
 * and orders keep working without remapping.
 *
 * Idempotent — safe to run more than once (ON CONFLICT DO NOTHING).
 *
 * Usage:  npm run db:backfill
 *
 * Run this AFTER `npm run db:migrate` has created the tables.
 * Only disable Neon Managed Auth in the Neon Console after sign-in works.
 */
import postgres from 'postgres';

// Node 20+: load .env without extra dependencies.
process.loadEnvFile?.();

const url = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL (or DATABASE_URL_POOLED) must be set in .env');
	process.exit(1);
}

const sql = postgres(url, { prepare: false });

const COPY_USERS = sql`
	INSERT INTO "user" ("id", "name", "email", "email_verified", "image", "status", "created_at", "updated_at")
	SELECT
		u.id,
		COALESCE(u.name, 'ovyn'),
		COALESCE(u.email, u.id || '@discord.ovyn.bio'),
		COALESCE(u."emailVerified", true),
		u.image,
		'active',
		u."createdAt",
		u."updatedAt"
	FROM neon_auth.user u
	ON CONFLICT ("id") DO NOTHING
`;

const COPY_ACCOUNTS = sql`
	INSERT INTO "account" ("id", "account_id", "provider_id", "user_id", "access_token", "refresh_token", "scope", "created_at", "updated_at")
	SELECT
		gen_random_uuid()::text,
		a."accountId",
		a."providerId",
		a."userId",
		a."accessToken",
		a."refreshToken",
		a."scope",
		a."createdAt",
		a."updatedAt"
	FROM neon_auth.account a
	WHERE a."providerId" = 'discord'
	ON CONFLICT ("id") DO NOTHING
`;

try {
	await sql.begin(async (tx) => {
		await tx`${COPY_USERS}`;
		await tx`${COPY_ACCOUNTS}`;
	});

	const [{ users }] = await sql`SELECT count(*)::int AS users FROM "user"`;
	const [{ accounts }] = await sql`SELECT count(*)::int AS accounts FROM "account" WHERE provider_id = 'discord'`;

	console.log(`Backfill complete: ${users} users, ${accounts} Discord accounts in the standalone tables.`);
	console.log('Verify sign-in with Discord, then you can disable Neon Managed Auth in the Neon Console.');
} catch (err) {
	console.error('Backfill failed:', err instanceof Error ? err.message : err);
	console.error('Hint: run `npm run db:migrate` first so the standalone tables exist.');
	process.exitCode = 1;
} finally {
	await sql.end();
}
