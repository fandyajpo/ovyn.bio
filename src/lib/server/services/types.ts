import type { db } from '#lib/server/db';

/** The transaction callback type - a `db` or `tx` client. */
export type TransactionFn = Parameters<typeof db.transaction>[0];
