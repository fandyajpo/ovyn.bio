import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { username } from 'better-auth/plugins';
import {
	DISCORD_CLIENT_ID,
	DISCORD_CLIENT_SECRET,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	BETTER_AUTH_SECRET,
	BETTER_AUTH_URL
} from '$app/env/private';
import { db } from '#lib/server/db';
import * as schema from '#lib/server/db/schema';
import { provisionUser } from '#lib/server/services/profiles';
import { isValidSlug } from '#lib/server/utils/slug';

function createAuth() {
	const discordClientId = DISCORD_CLIENT_ID;
	const discordClientSecret = DISCORD_CLIENT_SECRET;
	const googleClientId = GOOGLE_CLIENT_ID;
	const googleClientSecret = GOOGLE_CLIENT_SECRET;

	if (!BETTER_AUTH_SECRET) {
		throw new Error('BETTER_AUTH_SECRET must be set');
	}

	const socialProviders = {
		...(discordClientId && discordClientSecret
			? {
					discord: {
						clientId: discordClientId,
						clientSecret: discordClientSecret,
						// Identity only - we never require the user's email.
						scope: ['identify']
					}
				}
			: {}),
		...(googleClientId && googleClientSecret
			? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
			: {})
	};

	return betterAuth({
		// SvelteKit 3 doesn't populate process.env from .env - pass explicitly.
		secret: BETTER_AUTH_SECRET,
		baseURL: BETTER_AUTH_URL,
		database: drizzleAdapter(db, { provider: 'pg', schema }),
		// Credential sign-in: email or username plus password. Social providers
		// are optional individually; at least one sign-in path always exists.
		emailAndPassword: { enabled: true },
		socialProviders,
		// Discord accounts without email use a stable placeholder address.
		mapProfileToUser: (profile: { id: string; email?: string | null }) => ({
			email: profile.email ?? `${profile.id}@oauth.ovyn.me`,
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
		plugins: [
			// Auth usernames follow the same rules as public profile slugs, so a
			// credential sign-up seeds the profile with that username directly.
			username({
				minUsernameLength: 2,
				maxUsernameLength: 32,
				// Lowercase before validating so mixed-case input passes the
				// slug rules regardless of the plugin's validation order.
				usernameNormalization: (value) => value.toLowerCase(),
				usernameValidator: (value) => isValidSlug(value.toLowerCase())
			}),
			sveltekitCookies(getRequestEvent)
		]
	});
}

type Auth = ReturnType<typeof createAuth>;

let cached: Auth | null = null;

export function getAuth(): Auth {
	if (!cached) cached = createAuth();
	return cached;
}

/**
 * Lazy auth handle: betterAuth is created on first use, not at module load, so
 * prerendering and builds never need the auth credentials - the design env.ts
 * documents. Every property access forwards to the real instance.
 */
export const auth: Auth = new Proxy({} as Auth, {
	get(_target, prop) {
		const instance = getAuth();
		const value = Reflect.get(instance, prop, instance);
		return typeof value === 'function' ? value.bind(instance) : value;
	}
});

export type AuthSession = Auth['$Infer']['Session'];