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
	// SvelteKit 3 doesn't populate process.env from .env — pass explicitly.
	secret: BETTER_AUTH_SECRET,
	baseURL: BETTER_AUTH_URL,
	database: drizzleAdapter(db, { provider: 'pg', schema }),
	// Discord OAuth is the ONLY authentication method.
	emailAndPassword: { enabled: false },
	socialProviders: {
		discord: {
			clientId: discordClientId,
			clientSecret: discordClientSecret,
			// Identity only — we never require the user's email.
			scope: ['identify']
		}
	},
	// Some Discord accounts have no email — synthesize a stable placeholder
	// so Better Auth's unique email column stays satisfied.
	// https://better-auth.com/docs/concepts/oauth
	mapProfileToUser: (profile) => ({
		email: profile.email ?? `${profile.id}@discord.ovyn.bio`,
		emailVerified: false
	}),
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
