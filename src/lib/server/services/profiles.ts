import { and, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { discordAccounts, neonAuthUser, profiles } from '#lib/server/db/schema';
import { neonAuthAccount } from '#lib/server/db/schema/neon-auth';
import { ConflictError, isUniqueViolation, NotFoundError } from '../utils/errors';
import { isValidSlug, normalizeSlug } from '../utils/slug';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const DISCORD_API = 'https://discord.com/api/v10';

type DiscordUser = {
	id: string;
	username: string;
	global_name: string | null;
	avatar: string | null;
};

async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
	const res = await fetch(`${DISCORD_API}/users/@me`, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) {
		throw new Error(`Discord API returned ${res.status}`);
	}
	return res.json();
}

/**
 * Provision the OVYN identity for a managed-auth user: store their Discord
 * identity (fetched server-to-server, never from the client) and make sure
 * a profile with a unique slug exists. Failures must not block requests.
 */
export async function provisionUser(userId: string): Promise<void> {
	// Cheap early exit — hooks call this on every authenticated request.
	const [existing] = await db
		.select({ id: profiles.id })
		.from(profiles)
		.where(eq(profiles.userId, userId))
		.limit(1);
	if (existing) return;

	// Identity data lives in Neon Auth's managed schema.
	const [authUser] = await db
		.select()
		.from(neonAuthUser)
		.where(eq(neonAuthUser.id, userId))
		.limit(1);
	if (!authUser) return;

	const [authAccount] = await db
		.select()
		.from(neonAuthAccount)
		.where(and(eq(neonAuthAccount.userId, userId), eq(neonAuthAccount.providerId, 'discord')))
		.limit(1);

	// Managed Better Auth stores the display name, not the raw Discord
	// username — fetch it from Discord directly on the backend.
	let discordUsername = authUser.name ?? 'ovyn';
	let discordAvatarUrl = authUser.image;

	if (authAccount?.accessToken) {
		try {
			const discordUser = await fetchDiscordUser(authAccount.accessToken);
			discordUsername = discordUser.username;
			discordAvatarUrl = discordUser.avatar
				? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=256`
				: authUser.image;
		} catch (err) {
			console.error('Discord identity fetch failed', err);
		}
	}

	await db.transaction(async (tx) => {
		// Lock the auth user row so concurrent requests don't double-provision.
		await tx.execute(sql`SELECT id FROM neon_auth.user WHERE id = ${userId} FOR UPDATE`);

		await tx
			.insert(discordAccounts)
			.values({
				userId,
				discordId: authAccount?.accountId ?? userId,
				username: discordUsername,
				globalName: authUser.name,
				avatarUrl: discordAvatarUrl
			})
			.onConflictDoUpdate({
				target: discordAccounts.discordId,
				set: {
					userId,
					username: discordUsername,
					globalName: authUser.name,
					avatarUrl: discordAvatarUrl,
					updatedAt: new Date()
				}
			});

		await tx
			.insert(profiles)
			.values({
				userId,
				slug: await availableSlug(tx, discordUsername),
				displayName: authUser.name ?? discordUsername
			})
			.onConflictDoNothing({ target: profiles.userId });
	});
}