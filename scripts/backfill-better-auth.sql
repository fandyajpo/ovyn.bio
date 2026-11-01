-- ---------------------------------------------------------------------------
-- One-time data backfill: copy users + Discord accounts from Neon Auth's
-- managed `neon_auth` schema into the standalone Better Auth tables,
-- PRESERVING the same user ids so existing profiles, guild memberships,
-- and orders keep working without any remapping.
--
-- HOW TO USE:
--   1. Run `npm run db:generate` to create the migration file.
--   2. Open the generated file in ./drizzle (e.g. drizzle/000X_*.sql).
--   3. Right AFTER the `CREATE TABLE "user" ...;` statement, paste this
--      entire block. It must run BEFORE the FK switches on profiles,
--      guild_members, orders, etc.
--   4. Run `npm run db:migrate`.
--   5. Only AFTER verifying sign-in works, disable Neon Managed Auth in the
--      Neon Console. Never drop the `neon_auth` schema.
-- ---------------------------------------------------------------------------

-- Copy users. Discord accounts without an email get a stable placeholder.
INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "status", "createdAt", "updatedAt")
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
ON CONFLICT ("id") DO NOTHING;

-- Copy Discord OAuth accounts. New rows get fresh random ids; the
-- (provider, accountId) pair keeps the Discord identity stable.
INSERT INTO "account" ("id", "accountId", "providerId", "userId", "accessToken", "refreshToken", "scope", "createdAt", "updatedAt")
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
ON CONFLICT ("id") DO NOTHING;

-- Sanity check (run manually if you like):
-- SELECT count(*) FROM "user" u LEFT JOIN neon_auth.user nu ON nu.id = u.id WHERE nu.id IS NULL;
-- Expect 0 rows: every managed user has a standalone counterpart.
