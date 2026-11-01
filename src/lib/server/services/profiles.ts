import { and, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { discordAccounts, profiles } from '#lib/server/db/schema';
import { account } from '#lib/server/db/schema/auth';
import { ConflictError, isUniqueViolation, NotFoundError } from '#lib/server/utils/errors';
import { isValidSlug, normalizeSlug } from '#lib/server/utils/slug';

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
 * Runs inside a session-create hook, so failures must not block sign-in.
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

async function availableSlug(tx: Tx, discordUsername: string): Promise<string> {
	const base = normalizeSlug(discordUsername) || 'ovyn';
	let candidate = isValidSlug(base) ? base : `${base}-1`;

	for (let i = 1; i < 50; i++) {
		const [existing] = await tx
			.select({ id: profiles.id })
			.from(profiles)
			.where(eq(profiles.slug, candidate))
			.limit(1);
		if (!existing) return candidate;
		candidate = `${base}-${i + 1}`;
	}
	// Practically unreachable; fall back to a random suffix.
	return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

type ProfileUpdate = {
	displayName?: string;
	slug?: string;
	bio?: string | null;
	visibility?: 'public' | 'private';
};

export async function updateProfile(userId: string, update: ProfileUpdate) {
	return db.transaction(async (tx) => {
		if (update.slug) {
			// Lock the current row, then make sure the slug is free.
			await tx.execute(sql`SELECT id FROM profiles WHERE user_id = ${userId} FOR UPDATE`);
			const [taken] = await tx
				.select({ userId: profiles.userId })
				.from(profiles)
				.where(eq(profiles.slug, update.slug))
				.limit(1);
			if (taken && taken.userId !== userId) {
				throw new ConflictError('That username is already taken');
			}
		}

		const [updated] = await tx
			.update(profiles)
			.set({ ...update, updatedAt: new Date() })
			.where(eq(profiles.userId, userId))
			.returning();

		if (!updated) throw new NotFoundError('Profile not found');
		return updated;
	});
}

export async function setProfileMedia(
	userId: string,
	media: { avatarKey?: string | null; bannerKey?: string | null }
) {
	const [updated] = await db
		.update(profiles)
		.set({ ...media, updatedAt: new Date() })
		.where(eq(profiles.userId, userId))
		.returning();
	if (!updated) throw new NotFoundError('Profile not found');
	return updated;
}

export async function getProfileBySlug(slug: string) {
	const [row] = await db
		.select({ profile: profiles, discord: discordAccounts })
		.from(profiles)
		.leftJoin(discordAccounts, eq(discordAccounts.userId, profiles.userId))
		.where(eq(profiles.slug, slug))
		.limit(1);
	return row ?? null;
}

export async function getProfileByUserId(userId: string) {
	const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
	if (!row) throw new NotFoundError('Profile not found');
	return row;
}

export { isUniqueViolation };
