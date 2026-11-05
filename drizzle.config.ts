import { defineConfig } from "drizzle-kit";

// Migrations use the direct (non-pooled) database connection.
export default defineConfig({
  schema: "./src/lib/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Only our own public-schema tables are migrated. The `neon_auth` schema
  // is owned and managed by Neon's Managed Better Auth service.
  schemaFilter: ["public"],
  strict: true,
  verbose: true,
});

//
