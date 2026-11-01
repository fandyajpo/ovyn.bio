import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL, DATABASE_URL_POOLED } from '$app/env/private';
import * as schema from '#lib/server/db/schema';

/**
 * Application queries use Neon's pooled connection string.
 * Migrations (drizzle-kit) use DATABASE_URL directly — see drizzle.config.ts.
 */
const connectionString = DATABASE_URL_POOLED || DATABASE_URL;

if (!connectionString) {
	throw new Error('DATABASE_URL_POOLED or DATABASE_URL must be set');
}

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

export { schema };
