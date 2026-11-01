import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, BETTER_AUTH_SECRET, BETTER_AUTH_URL } from '$app/env/private';
import { db } from '#lib/server/db';
import * as schema from '#lib/server/db/schema';
import { provisionUser } from '#lib/server/services/profiles';

const discordClientId = DISCORD_CLIENT_ID;
const discordClientSecret = DISCORD_CLIENT_SECRET;

if (!discordClientId || !discordClientSecret) {
	throw new Error('DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET must be set');
}

if (!BETTER_AUTH_SECRET) {
	throw new Error('BETTER_AUTH_SECRET must be set');
}

export const auth = betterAuth({
	// Better Auth reads process.env internally, which SvelteKit 3 no longer
	// populates from .env — pass everything explicitly from the typed env.
	secret: BETTER_AUTH_SECRET,
	baseURL: BETTER_AUTH_URL,
	database: drizzleAdapter(db, { provider: 'pg', schema }),
	emailAndPassword: { enabled: false },
	socialProviders: {
		discord: {
			clientId: discordClientId,
			clientSecret: discordClientSecret,
			// Identity only — we never require the user's email.
			scope: ['identify']
		}
	},
	user: {
		additionalFields: {
			status: { type: 'string', defaultValue: 'active', input: false }
		}
	},
	databaseHooks: {
		session: {
			// Provision / refresh identity data after sign-in.
			create: {
				after: async (session) => {
					try {
						await provisionUser(session.userId);
					} catch (err) {
						// Never block sign-in on provisioning failures.
						console.error('provisionUser failed', err);
					}
				}
			}
		}
	},
	advanced: {
		database: { joins: true }
	},
	plugins: [sveltekitCookies(getRequestEvent)]
});

export type AuthSession = typeof auth.$Infer.Session;
