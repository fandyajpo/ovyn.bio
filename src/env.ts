import { defineEnvVars } from '@sveltejs/kit/env';
import { z } from 'zod';

/**
 * SvelteKit 3 explicit environment variables.
 *
 * All values are private (server-only). They're optional here so the app can
 * build without credentials; individual services throw their own clear errors
 * at runtime when a value they need is missing.
 */
export const variables = defineEnvVars({
	// Neon PostgreSQL
	DATABASE_URL: { schema: z.string().optional() },
	DATABASE_URL_POOLED: { schema: z.string().optional() },

	// Standalone Better Auth + Discord OAuth
	BETTER_AUTH_SECRET: { schema: z.string().optional() },
	BETTER_AUTH_URL: { schema: z.string().optional() },
	DISCORD_CLIENT_ID: { schema: z.string().optional() },
	DISCORD_CLIENT_SECRET: { schema: z.string().optional() },
	GOOGLE_CLIENT_ID: { schema: z.string().optional() },
	GOOGLE_CLIENT_SECRET: { schema: z.string().optional() },
	OVYN_ADMIN_DISCORD_IDS: { schema: z.string().optional() },

	// Neon Object Storage (S3-compatible)
	AWS_ENDPOINT_URL_S3: { schema: z.string().optional() },
	AWS_ACCESS_KEY_ID: { schema: z.string().optional() },
	AWS_SECRET_ACCESS_KEY: { schema: z.string().optional() },
	AWS_REGION: { schema: z.string().optional() },
	S3_BUCKET: { schema: z.string().optional() },

	// DOKU Direct API
	DOKU_CLIENT_ID: { schema: z.string().optional() },
	DOKU_SECRET_KEY: { schema: z.string().optional() },
	DOKU_API_KEY: { schema: z.string().optional() },
	DOKU_PRIVATE_KEY: { schema: z.string().optional() },
	DOKU_PARTNER_SERVICE_ID: { schema: z.string().optional() },
	DOKU_ENV: { schema: z.string().optional() },
	DOKU_BASE_URL: { schema: z.string().optional() }
});
