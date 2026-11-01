import { pgSchema, text } from 'drizzle-orm/pg-core';

/**
 * Read-only representations of Neon Auth's managed tables (Managed Better
 * Auth stores users/sessions/OAuth accounts in the `neon_auth` schema and
 * owns them — our migrations must never touch them, which `schemaFilter`
 * in drizzle.config.ts enforces). They exist here only so app tables can
 * declare foreign keys to `neon_auth.user` and services can read identity
 * data.
 */
export const neonAuthSchema = pgSchema('neon_auth');

export const neonAuthUser = neonAuthSchema.table('user', {
	id: text('id').primaryKey(),
	name: text('name'),
	email: text('email'),
	image: text('image')
});

export const neonAuthAccount = neonAuthSchema.table('account', {
	id: text('id').primaryKey(),
	userId: text('user_id'),
	providerId: text('provider_id'),
	accountId: text('account_id'),
	accessToken: text('access_token')
});
