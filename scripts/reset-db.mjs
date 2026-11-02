/**
 * Rebuild the database from scratch.
 *
 * Drops every table (the whole `public` schema), the Drizzle migration
 * tracking schema, and the legacy `neon_auth` schema when it still exists.
 * Afterwards run `npm run db:migrate` and `npm run db:seed-shop` to build a
 * clean database from the migration files.
 *
 * This is destructive. It only runs with an explicit flag:
 *
 *   npm run db:reset -- --yes
 *
 * Uses DATABASE_URL (the direct, non-pooled connection) so the whole schema
 * can be dropped without a pooled connection interfering.
 */
import postgres from 'postgres';

process.loadEnvFile?.();

if (!process.argv.includes('--yes')) {
	console.error('Refusing to reset: this drops every table and all data.');
	console.error('Run it again with: npm run db:reset -- --yes');
	process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL must be set in .env');
	process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });

try {
	const [schemas] = await sql`
		SELECT
			EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'neon_auth') AS "hasNeonAuth"
	`;

	await sql.unsafe('DROP SCHEMA IF EXISTS "drizzle" CASCADE');
	await sql.unsafe('DROP SCHEMA IF EXISTS "public" CASCADE');
	await sql.unsafe('CREATE SCHEMA "public"');

	if (schemas?.hasNeonAuth) {
		await sql.unsafe('DROP SCHEMA IF EXISTS "neon_auth" CASCADE');
		console.log('Dropped the legacy neon_auth schema as well.');
	}

	console.log('Database reset. Public and drizzle schemas are empty.');
	console.log('Next: npm run db:migrate, then npm run db:seed-shop.');
} catch (err) {
	console.error('Reset failed:', err instanceof Error ? err.message : err);
	process.exitCode = 1;
} finally {
	await sql.end();
}
