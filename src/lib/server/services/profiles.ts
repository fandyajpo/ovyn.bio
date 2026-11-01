import { and, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { account, user } from '#lib/server/db/schema/auth';
import { discordAccounts, profiles } from '#lib/server/db/schema';
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
 * Refresh identity data from Discord (backend-to-backend — never from the
 * client) and make sure the user has a profile with a unique slug.
 * Runs inside Better Auth's session-create hook, so failures must not
 * block sign-in.
 */
export async function provisionUser(userId: string): Promise<void> {
	const [acc] = await db
		.select()
		.from(account)
		.where(and(eq(account.userId, userId), eq(account.providerId, 'discord')))
		.limit(1);

	if (!acc?.accessToken) return;

	let discordUser: DiscordUser;
	try {
		discordUser = await fetchDiscordUser(acc.accessToken);
	} catch (err) {
		console.error('Discord identity fetch failed', err);
		return;
	}

	const avatarUrl = discordUser.avatar
		? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=256`
		: null;

	await db.transaction(async (tx) => {
		// Lock the account row so two concurrent sign-ins don't race.
		await tx.execute(sql`SELECT id FROM "account" WHERE id = ${acc.id} FOR UPDATE`);

		await tx
			.insert(discordAccounts)
			.values({
				userId,
				discordId: discordUser.id,
				username: discordUser.username,
				globalName: discordUser.global_name,
				avatarUrl
			})
			.onConflictDoUpdate({
				target: discordAccounts.discordId,
				set: {
					userId,
					username: discordUser.username,
					globalName: discordUser.global_name,
					avatarUrl,
					updatedAt: new Date()
				}
			});

		// Profile creation happens once; later sign-ins just refresh Discord data.
		await tx
			.insert(profiles)
			.values({
				userId,
				slug: await availableSlug(tx, discordUser.username),
				displayName: discordUser.global_name ?? discordUser.username
			})
			.onConflictDoNothing({ target: profiles.userId });
	});
}

export { isUniqueViolation, user };