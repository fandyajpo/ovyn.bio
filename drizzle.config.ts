import { defineConfig } from 'drizzle-kit';

// Migrations use the direct (non-pooled) database connection.
export default defineConfig({
	schema: './src/lib/server/db/schema/index.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL!
	},
	strict: true,
	verbose: true
});
