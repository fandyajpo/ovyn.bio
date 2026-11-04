import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL, DATABASE_URL_POOLED } from '$app/env/private';
import * as schema from '#lib/server/db/schema';

type Db = PostgresJsDatabase<typeof schema>;

/**
 * Application queries use Neon's pooled connection string.
 * Migrations (drizzle-kit) use DATABASE_URL directly - see drizzle.config.ts.
 */
function createDb(): Db {
	const connectionString = DATABASE_URL_POOLED || DATABASE_URL;

	if (!connectionString) {
		throw new Error('DATABASE_URL_POOLED or DATABASE_URL must be set');
	}

	return drizzle(postgres(connectionString, { prepare: false }), { schema });
}

let cached: Db | null = null;

export function getDb(): Db {
	if (!cached) cached = createDb();
	return cached;
}

/**
 * Lazy database handle: the connection is created on first use, not at module
 * load, so prerendering and builds never need credentials - the design env.ts
 * documents. Every property access forwards to the real instance.
 */
export const db: Db = new Proxy({} as Db, {
	get(_target, prop) {
		const instance = getDb();
		const value = Reflect.get(instance, prop, instance);
		return typeof value === 'function' ? value.bind(instance) : value;
	}
});

export { schema };