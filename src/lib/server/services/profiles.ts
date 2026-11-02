import { and, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { account, user } from '#lib/server/db/schema/auth';
import { discordAccounts, profiles } from '#lib/server/db/schema';
import { ConflictError, isUniqueViolation, NotFoundError, ValidationError } from '../utils/errors';
import { isValidSlug, normalizeSlug } from '../utils/slug';
import { deleteReplacedObject } from '#lib/server/storage';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const DISCORD_API = 'https://discord.com/api/v10';

type DiscordUser = {
	id: string;
	username: string;
	global_name: string | null;
	bio: string | null;
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

/**
 * Sync Discord identity when available and ensure every OAuth user has a
 * profile with a unique slug. Runs inside Better Auth's session-create hook,
 * so failures must not block sign-in. ovyn profile details stay user-owned.
 */
export async function provisionUser(userId: string): Promise<void> {
	const [acc] = await db
		.select()
		.from(account)
		.where(and(eq(account.userId, userId), eq(account.providerId, 'discord')))
		.limit(1);

	if (!acc?.accessToken) {
		const [authUser] = await db
			.select({ name: user.name })
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);
		if (!authUser) return;

		await db.transaction(async (tx) => {
			await tx.execute(sql`SELECT id FROM "user" WHERE id = ${userId} FOR UPDATE`);
			const [profile] = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
			if (profile) return;
			await tx
				.insert(profiles)
				.values({
					userId,
					slug: await availableSlug(tx, authUser.name || 'ovyn'),
					displayName: authUser.name || 'ovyn member'
				})
				.onConflictDoNothing({ target: profiles.userId });
		});
		return;
	}

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
	const newDiscordName = discordUser.global_name ?? discordUser.username;

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

		// Seed a profile from Discord on first sign-in; later profile edits are
		// owned by the user and stay independent of Discord changes.
		const [profile] = await tx
			.select()
			.from(profiles)
			.where(eq(profiles.userId, userId))
			.limit(1);

		if (!profile) {
			await tx
				.insert(profiles)
				.values({
					userId,
					slug: await availableSlug(tx, discordUser.username),
					displayName: newDiscordName,
					bio: discordUser.bio
				})
				.onConflictDoNothing({ target: profiles.userId });
			return;
		}

		// Existing profile fields are ovyn-owned and are intentionally not
		// overwritten when Discord identity data changes.
	});
}

/** Save user-owned profile details; the unique database constraint is the race-safe final username check. */
export async function updateProfileIdentity(
	userId: string,
	input: { username: string; displayName: string; bio: string | null }
) {
	if (!isValidSlug(input.username)) throw new ValidationError('Choose a valid username');

	try {
		const [updated] = await db
			.update(profiles)
			.set({
				slug: input.username,
				displayName: input.displayName,
				bio: input.bio,
				updatedAt: new Date()
			})
			.where(eq(profiles.userId, userId))
			.returning();
		if (!updated) throw new NotFoundError('Profile not found');
		return updated;
	} catch (err) {
		if (isUniqueViolation(err, 'profiles_slug_unique')) {
			throw new ConflictError('That username is already taken', 'username_taken');
		}
		throw err;
	}
}

export async function checkUsernameAvailability(userId: string, rawUsername: string) {
	const username = rawUsername.trim().toLowerCase();
	if (!isValidSlug(username)) return { username, valid: false, available: false };

	const [existing] = await db
		.select({ userId: profiles.userId })
		.from(profiles)
		.where(eq(profiles.slug, username))
		.limit(1);
	return { username, valid: true, available: !existing || existing.userId === userId };
}

/** The file currently attached to a profile column, for cleanup after a replace. */
async function currentProfileFile(userId: string): Promise<Record<'avatarKey' | 'bannerKey' | 'audioKey' | 'cursorKey' | 'backgroundKey', string | null>> {
	const [row] = await db
		.select({
			avatarKey: profiles.avatarKey,
			bannerKey: profiles.bannerKey,
			audioKey: profiles.audioKey,
			cursorKey: profiles.cursorKey,
			backgroundKey: profiles.backgroundKey
		})
		.from(profiles)
		.where(eq(profiles.userId, userId))
		.limit(1);
	return {
		avatarKey: row?.avatarKey ?? null,
		bannerKey: row?.bannerKey ?? null,
		audioKey: row?.audioKey ?? null,
		cursorKey: row?.cursorKey ?? null,
		backgroundKey: row?.backgroundKey ?? null
	};
}

/** A null avatar key restores the current Discord avatar as the profile picture. */
export async function setProfileAvatar(userId: string, avatarKey: string | null) {
	const previous = (await currentProfileFile(userId)).avatarKey;
	const [updated] = await db
		.update(profiles)
		.set({ avatarKey, updatedAt: new Date() })
		.where(eq(profiles.userId, userId))
		.returning();
	if (!updated) throw new NotFoundError('Profile not found');
	if (previous && previous !== avatarKey) await deleteReplacedObject(previous);
	return updated;
}

export async function setProfileVisibility(
	userId: string,
	visibility: 'public' | 'private'
) {
	const [updated] = await db
		.update(profiles)
		.set({ visibility, updatedAt: new Date() })
		.where(eq(profiles.userId, userId))
		.returning();
	if (!updated) throw new NotFoundError('Profile not found');
	return updated;
}

export async function setProfileBanner(userId: string, bannerKey: string) {
	const previous = (await currentProfileFile(userId)).bannerKey;
	const [updated] = await db
		.update(profiles)
		.set({ bannerKey, updatedAt: new Date() })
		.where(eq(profiles.userId, userId))
		.returning();
	if (!updated) throw new NotFoundError('Profile not found');
	if (previous && previous !== bannerKey) await deleteReplacedObject(previous);
	return updated;
}

export async function setProfileAudioKey(userId: string, audioKey: string | null) {
	const previous = (await currentProfileFile(userId)).audioKey;
	const [updated] = await db
		.update(profiles)
		.set({ audioKey, updatedAt: new Date() })
		.where(eq(profiles.userId, userId))
		.returning();
	if (!updated) throw new NotFoundError('Profile not found');
	if (previous && previous !== audioKey) await deleteReplacedObject(previous);
	return updated;
}

export async function setProfileCursorKey(userId: string, cursorKey: string | null) {
	const previous = (await currentProfileFile(userId)).cursorKey;
	const [updated] = await db
		.update(profiles)
		.set({ cursorKey, updatedAt: new Date() })
		.where(eq(profiles.userId, userId))
		.returning();
	if (!updated) throw new NotFoundError('Profile not found');
	if (previous && previous !== cursorKey) await deleteReplacedObject(previous);
	return updated;
}

export async function setProfileTheme(userId: string, theme: string) {
	const [updated] = await db
		.update(profiles)
		.set({ theme, updatedAt: new Date() })
		.where(eq(profiles.userId, userId))
		.returning();
	if (!updated) throw new NotFoundError('Profile not found');
	return updated;
}

export async function setProfileUsernameColor(userId: string, usernameColor: string | null) {
	const [updated] = await db
		.update(profiles)
		.set({ usernameColor, updatedAt: new Date() })
		.where(eq(profiles.userId, userId))
		.returning();
	if (!updated) throw new NotFoundError('Profile not found');
	return updated;
}

export async function setProfileBackground(
	userId: string,
	backgroundTexture: string,
	backgroundFixed: boolean
) {
	const [updated] = await db
		.update(profiles)
		.set({ backgroundTexture, backgroundFixed, updatedAt: new Date() })
		.where(eq(profiles.userId, userId))
		.returning();
	if (!updated) throw new NotFoundError('Profile not found');
	return updated;
}

export async function setProfileBackgroundKey(userId: string, backgroundKey: string | null) {
	const previous = (await currentProfileFile(userId)).backgroundKey;
	const [updated] = await db
		.update(profiles)
		.set({ backgroundKey, updatedAt: new Date() })
		.where(eq(profiles.userId, userId))
		.returning();
	if (!updated) throw new NotFoundError('Profile not found');
	if (previous && previous !== backgroundKey) await deleteReplacedObject(previous);
	return updated;
}

export async function getProfileBySlug(slug: string) {
	const [row] = await db
		.select({ profile: profiles, discord: discordAccounts, authUser: user })
		.from(profiles)
		.leftJoin(discordAccounts, eq(discordAccounts.userId, profiles.userId))
		.innerJoin(user, eq(user.id, profiles.userId))
		.where(eq(profiles.slug, slug))
		.limit(1);
	return row ?? null;
}

export async function getProfileByUserId(userId: string) {
	const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
	if (!row) throw new NotFoundError('Profile not found');
	return row;
}

export async function getDiscordAccountByUserId(userId: string) {
	const [row] = await db.select().from(discordAccounts).where(eq(discordAccounts.userId, userId)).limit(1);
	return row ?? null;
}

export { isUniqueViolation, user };
