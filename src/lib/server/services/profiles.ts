import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { account, user } from '#lib/server/db/schema/auth';
import { discordAccounts, profileSlugHistory, profiles } from '#lib/server/db/schema';
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

async function availableSlug(tx: Tx, seed: string): Promise<string> {
	// 29 chars leaves room for `-NN` suffixes and stays within the 32-char slug limit.
	const base = normalizeSlug(seed).slice(0, 29) || 'ovyn';
	// Reserved route names can never be a profile slug (isValidSlug refuses them),
	// so they start suffixed like every other taken candidate.
	let candidate = isValidSlug(base) ? base : `${base}-1`;

	for (let i = 1; i < 50; i++) {
		const [existing] = await tx
			.select({ id: profiles.id })
			.from(profiles)
			.where(eq(profiles.slug, candidate))
			.limit(1);
		// Retired slugs stay reserved so old public links never break.
		const [claimed] = await tx
			.select({ slug: profileSlugHistory.slug })
			.from(profileSlugHistory)
			.where(eq(profileSlugHistory.slug, candidate))
			.limit(1);
		if (!existing && !claimed) return candidate;
		candidate = `${base}-${i + 1}`;
	}
	// Practically unreachable; fall back to a random suffix.
	return `${base.slice(0, 23)}-${crypto.randomUUID().slice(0, 8)}`;
}

const SLUG_RETRY_ATTEMPTS = 5;

/**
 * Slug selection is check-then-insert, so two first sign-ins can race the same
 * candidate and the loser hits the slug unique constraint. Postgres aborts the
 * whole transaction on that error, so the run retries from scratch and re-picks
 * the next free slug.
 */
async function withSlugRetry(run: () => Promise<void>): Promise<void> {
	for (let attempt = 0; attempt < SLUG_RETRY_ATTEMPTS; attempt++) {
		try {
			await run();
			return;
		} catch (err) {
			if (!isUniqueViolation(err, 'profiles_slug_unique')) throw err;
		}
	}
	throw new Error('Profile provisioning failed after repeated slug collisions');
}

/**
 * Every signed-in account needs a profile row, even when the Discord identity
 * cannot be read, so the workspace and public pages never meet a missing row.
 */
async function ensureProfile(userId: string, fallbackName: string): Promise<void> {
	const [authUser] = await db
		.select({ name: user.name, username: user.username })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);
	if (!authUser) return;

	await withSlugRetry(() =>
		db.transaction(async (tx) => {
			await tx.execute(sql`SELECT id FROM "user" WHERE id = ${userId} FOR UPDATE`);
			const [profile] = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
			if (profile) return;
			await tx
				.insert(profiles)
				.values({
					userId,
					// A credential sign-up already picked a slug-safe username; prefer it.
					slug: await availableSlug(tx, authUser.username || authUser.name || fallbackName),
					displayName: authUser.name || fallbackName
				})
				.onConflictDoNothing({ target: profiles.userId });
		})
	);
}

/**
 * Registers the provider identity exactly once. On the account's first
 * sign-in the Discord identity is stored and the profile is seeded from it;
 * every later sign-in touches nothing — no provider fetch, no writes — so the
 * database is the only source of identity data after registration and ovyn
 * details stay user-owned. Runs inside Better Auth's session-create hook, so
 * failures must never block sign-in.
 */
export async function provisionUser(userId: string): Promise<void> {
	// Already registered: nothing to sync, nothing to fetch.
	const [registered] = await db
		.select({ id: discordAccounts.id })
		.from(discordAccounts)
		.where(eq(discordAccounts.userId, userId))
		.limit(1);
	if (registered) return;

	const [acc] = await db
		.select()
		.from(account)
		.where(and(eq(account.userId, userId), eq(account.providerId, 'discord')))
		.limit(1);

	if (!acc?.accessToken) {
		await ensureProfile(userId, 'ovyn member');
		return;
	}

	// First registration: read the provider identity once and store it.
	let discordUser: DiscordUser;
	try {
		discordUser = await fetchDiscordUser(acc.accessToken);
	} catch (err) {
		// A stale Discord token must not leave the account without a profile.
		console.error('Discord identity fetch failed', err);
		try {
			await ensureProfile(userId, 'ovyn member');
		} catch (profileError) {
			console.error('Profile provisioning failed', profileError);
		}
		return;
	}

	await withSlugRetry(() =>
		db.transaction(async (tx) => {
			// Lock the account row so two concurrent sign-ins don't race.
			await tx.execute(sql`SELECT id FROM "account" WHERE id = ${acc.id} FOR UPDATE`);

			await tx
				.insert(discordAccounts)
				.values({
					userId,
					discordId: discordUser.id,
					username: discordUser.username,
					globalName: discordUser.global_name
				})
				.onConflictDoNothing({ target: discordAccounts.discordId });

			await tx
				.insert(profiles)
				.values({
					userId,
					slug: await availableSlug(tx, discordUser.username),
					displayName: discordUser.global_name ?? discordUser.username,
					bio: discordUser.bio
				})
				.onConflictDoNothing({ target: profiles.userId });
		})
	);
}

/**
 * Save user-owned profile details; the unique database constraint is the race-safe
 * final username check. The previous slug lands in profile_slug_history so existing
 * links keep resolving, and a freed slug stays reserved while its history row
 * exists (except for the profile reclaiming it, which drops the row).
 */
export async function updateProfileIdentity(
	userId: string,
	input: { username: string; displayName: string; bio: string | null }
) {
	if (!isValidSlug(input.username)) throw new ValidationError('Choose a valid username');

	try {
		const [current] = await db
			.select({ id: profiles.id, slug: profiles.slug })
			.from(profiles)
			.where(eq(profiles.userId, userId))
			.limit(1);
		if (!current) throw new NotFoundError('Profile not found');

		if (current.slug !== input.username) {
			// A slug another profile retired cannot be claimed.
			const [claimed] = await db
				.select({ profileId: profileSlugHistory.profileId })
				.from(profileSlugHistory)
				.where(eq(profileSlugHistory.slug, input.username))
				.limit(1);
			if (claimed && claimed.profileId !== current.id) {
				throw new ConflictError('That username was used recently. Pick another one.');
			}
		}

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

		if (current.slug !== updated.slug) {
			await db
				.insert(profileSlugHistory)
				.values({ profileId: updated.id, slug: current.slug })
				.onConflictDoNothing({ target: profileSlugHistory.slug });
		}
		// If the new slug was retired by this same profile earlier, drop its
		// history row so the reclaimed slug is live and claimable again.
		await db
			.delete(profileSlugHistory)
			.where(and(eq(profileSlugHistory.profileId, updated.id), eq(profileSlugHistory.slug, updated.slug)));

		return updated;
	} catch (err) {
		if (isUniqueViolation(err, 'profiles_slug_unique')) {
			throw new ConflictError('That username is already taken', 'username_taken');
		}
		throw err;
	}
}

/** The slug a retired profile URL points to today, for 301 redirects. */
export async function getSlugRedirect(slug: string): Promise<string | null> {
	const [row] = await db
		.select({ currentSlug: profiles.slug })
		.from(profileSlugHistory)
		.innerJoin(profiles, eq(profiles.id, profileSlugHistory.profileId))
		.where(eq(profileSlugHistory.slug, slug))
		.limit(1);
	return row?.currentSlug ?? null;
}

export async function checkUsernameAvailability(userId: string, rawUsername: string) {
	const username = rawUsername.trim().toLowerCase();
	if (!isValidSlug(username)) return { username, valid: false, available: false };

	const [existing] = await db
		.select({ userId: profiles.userId })
		.from(profiles)
		.where(eq(profiles.slug, username))
		.limit(1);
	// Retired slugs stay reserved, unless the live profile carrying the same
	// slug belongs to the caller (they are re-checking their own identity).
	const [claimed] = await db
		.select({ profileId: profileSlugHistory.profileId })
		.from(profileSlugHistory)
		.where(eq(profileSlugHistory.slug, username))
		.limit(1);
	const liveIsOwn = Boolean(existing && existing.userId === userId);
	return {
		username,
		valid: true,
		available: (!existing || liveIsOwn) && (!claimed || liveIsOwn)
	};
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

export async function setProfileBackgroundKey(userId: string, backgroundKey: string | null) {	const previous = (await currentProfileFile(userId)).backgroundKey;
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

/** Public profile slugs for the sitemap; capped so the response stays light. */
export async function listPublicProfileSlugs(): Promise<string[]> {
	const rows = await db
		.select({ slug: profiles.slug })
		.from(profiles)
		.where(eq(profiles.visibility, 'public'))
		.orderBy(desc(profiles.updatedAt))
		.limit(5000);
	return rows.map((row) => row.slug);
}

export { isUniqueViolation, user };
