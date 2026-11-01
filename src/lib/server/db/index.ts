import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema';

/**
 * Application queries use Neon's pooled connection string.
 * Migrations (drizzle-kit) use DATABASE_URL directly — see drizzle.config.ts.
 */
const connectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error('DATABASE_URL_POOLED or DATABASE_URL must be set');
}

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

export { schema };
