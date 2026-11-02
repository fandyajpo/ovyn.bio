import { and, asc, count, eq, ilike, sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { guildInvitations, guildMembers, guilds, profiles } from '#lib/server/db/schema';
import { user } from '#lib/server/db/schema/auth';
import {
	ConflictError,
	ForbiddenError,
	isUniqueViolation,
	NotFoundError,
	ValidationError
} from '#lib/server/utils/errors';
import { normalizeSlug, RESERVED_SLUGS } from '#lib/server/utils/slug';
import { deleteReplacedObject } from '#lib/server/storage';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type Role = 'owner' | 'officer' | 'member';

export type GuildInput = {
	name: string;
	slug?: string;
	description?: string | null;
	visibility: 'public' | 'private';
	iconKey?: string | null;
	bannerKey?: string | null;
};

function guildSlugCandidate(raw: string): string {
	const base = normalizeSlug(raw) || 'guild';
	return RESERVED_SLUGS.has(base) ? `${base}-guild` : base;
}

async function uniqueGuildSlug(tx: Tx, raw: string): Promise<string> {
	const base = guildSlugCandidate(raw);
	let candidate = base;
	for (let i = 1; i < 50; i++) {
		const [existing] = await tx
			.select({ id: guilds.id })
			.from(guilds)
			.where(eq(guilds.slug, candidate))
			.limit(1);
		if (!existing) return candidate;
		candidate = `${base}-${i + 1}`;
	}
	return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

async function currentMembership(tx: Tx, userId: string) {
	const [membership] = await tx
		.select({ guildId: guildMembers.guildId, role: guildMembers.role })
		.from(guildMembers)
		.where(eq(guildMembers.userId, userId))
		.limit(1);
	return membership ?? null;
}

/** Serialize concurrent membership writes by locking the user row. */
async function lockUserForMembership(tx: Tx, userId: string): Promise<void> {
	await tx.execute(sql`SELECT id FROM "user" WHERE id = ${userId} FOR UPDATE`);
}

// ---------------------------------------------------------------------------
// Membership invariant
// ---------------------------------------------------------------------------

/** Throws when the user already belongs to a guild. */
async function assertNoGuild(tx: Tx, userId: string): Promise<void> {
	const membership = await currentMembership(tx, userId);
	if (membership) {
		throw new ConflictError(
			'You already belong to a circle. Leave your current circle first before joining or creating another one.'
		);
	}
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getGuildBySlug(slug: string) {
	const [row] = await db.select().from(guilds).where(eq(guilds.slug, slug)).limit(1);
	return row ?? null;
}

export async function getGuildById(id: string) {
	const [row] = await db.select().from(guilds).where(eq(guilds.id, id)).limit(1);
	return row ?? null;
}

export async function listPublicGuilds(search: string | null) {
	const where = and(
		eq(guilds.visibility, 'public'),
		eq(guilds.status, 'active'),
		search ? ilike(guilds.name, `%${search}%`) : undefined
	);
	return db
		.select({
			guild: guilds,
			memberCount: count(guildMembers.userId)
		})
		.from(guilds)
		.leftJoin(guildMembers, eq(guildMembers.guildId, guilds.id))
		.where(where)
		.groupBy(guilds.id)
		.orderBy(asc(guilds.name))
		.limit(60);
}

export async function listGuildMembers(guildId: string) {
	return db
		.select({
			userId: guildMembers.userId,
			role: guildMembers.role,
			joinedAt: guildMembers.joinedAt,
			slug: profiles.slug,
			displayName: profiles.displayName,
			avatarKey: profiles.avatarKey,
			discordUsername: sql<string | null>`(
				SELECT username FROM discord_accounts
				WHERE discord_accounts.user_id = ${guildMembers.userId}
				LIMIT 1
			)`
		})
		.from(guildMembers)
		.innerJoin(profiles, eq(profiles.userId, guildMembers.userId))
		.where(eq(guildMembers.guildId, guildId))
		.orderBy(asc(guildMembers.joinedAt));
}

export async function getMembership(userId: string) {
	if (!userId) return null;
	const [row] = await db
		.select({ membership: guildMembers, guild: guilds })
		.from(guildMembers)
		.innerJoin(guilds, eq(guilds.id, guildMembers.guildId))
		.where(eq(guildMembers.userId, userId))
		.limit(1);
	return row ?? null;
}

// ---------------------------------------------------------------------------
// Mutations (all transactional - one guild per user is enforced server-side)
// ---------------------------------------------------------------------------

export async function createGuild(userId: string, input: GuildInput) {
	if (!input.name.trim()) throw new ValidationError('Circle name is required');

	return db.transaction(async (tx) => {
		await lockUserForMembership(tx, userId);
		await assertNoGuild(tx, userId);

		const slug = await uniqueGuildSlug(tx, input.slug || input.name);

		try {
			const [guild] = await tx
				.insert(guilds)
				.values({
					ownerId: userId,
					name: input.name.trim(),
					slug,
					description: input.description ?? null,
					visibility: input.visibility,
					iconKey: input.iconKey ?? null,
					bannerKey: input.bannerKey ?? null
				})
				.returning();

			if (!guild) throw new Error('Circle could not be created');

			await tx.insert(guildMembers).values({ userId, guildId: guild.id, role: 'owner' });

			return guild;
		} catch (err) {
			if (isUniqueViolation(err, 'guild_members_pkey')) {
				throw new ConflictError('You already belong to a circle');
			}
			throw err;
		}
	});
}

export async function joinGuild(userId: string, slug: string) {
	return db.transaction(async (tx) => {
		await lockUserForMembership(tx, userId);
		await assertNoGuild(tx, userId);

		const [guild] = await tx
			.select()
			.from(guilds)
			.where(and(eq(guilds.slug, slug), eq(guilds.status, 'active')))
			.limit(1);

		if (!guild) throw new NotFoundError('Circle not found');
		if (guild.visibility !== 'public') {
			throw new ForbiddenError('This circle is private. You need an invitation to join.');
		}

		try {
			await tx.insert(guildMembers).values({ userId, guildId: guild.id, role: 'member' });
		} catch (err) {
			if (isUniqueViolation(err, 'guild_members_pkey')) {
				throw new ConflictError('You already belong to a circle');
			}
			throw err;
		}

		return guild;
	});
}

export async function leaveGuild(userId: string) {
	await db.transaction(async (tx) => {
		const membership = await currentMembership(tx, userId);
		if (!membership) throw new NotFoundError('You are not in a circle');

		const [guild] = await tx.select().from(guilds).where(eq(guilds.id, membership.guildId)).limit(1);
		if (!guild) throw new NotFoundError('Circle not found');

		if (membership.role === 'owner') {
			const [countRow] = await tx
				.select({ total: count() })
				.from(guildMembers)
				.where(eq(guildMembers.guildId, guild.id));

			if (Number(countRow?.total ?? 0) > 1) {
				throw new ConflictError(
					'Owners must transfer ownership before leaving. Disband the circle if you are the only member.'
				);
			}
			throw new ConflictError(
				'You are the only member. Use "Disband circle" instead of leaving.'
			);
		}

		await tx.delete(guildMembers).where(eq(guildMembers.userId, userId));
	});
}

export async function transferOwnership(ownerId: string, targetUserId: string) {
	await db.transaction(async (tx) => {
		const membership = await currentMembership(tx, ownerId);
		if (!membership || membership.role !== 'owner') {
			throw new ForbiddenError('Only the owner can transfer ownership');
		}

		await tx.execute(sql`SELECT id FROM "user" WHERE id = ${targetUserId} FOR UPDATE`);

		const [target] = await tx
			.select()
			.from(guildMembers)
			.where(eq(guildMembers.userId, targetUserId))
			.limit(1);

		if (!target || target.guildId !== membership.guildId) {
			throw new ValidationError('That user is not a member of this circle');
		}
		if (targetUserId === ownerId) {
			throw new ValidationError('You already own this circle');
		}

		await tx
			.update(guildMembers)
			.set({ role: 'member' })
			.where(eq(guildMembers.userId, ownerId));
		await tx
			.update(guildMembers)
			.set({ role: 'owner' })
			.where(eq(guildMembers.userId, targetUserId));
		await tx.update(guilds).set({ ownerId: targetUserId, updatedAt: new Date() }).where(eq(guilds.id, membership.guildId));
	});
}

export async function setMemberRole(actorId: string, targetUserId: string, role: Role) {
	if (role === 'owner') throw new ValidationError('Use ownership transfer to grant the owner role');

	await db.transaction(async (tx) => {
		const actor = await currentMembership(tx, actorId);
		if (!actor || actor.role !== 'owner') {
			throw new ForbiddenError('Only the owner can change roles');
		}

		const [target] = await tx
			.select()
			.from(guildMembers)
			.where(eq(guildMembers.userId, targetUserId))
			.limit(1);

		if (!target || target.guildId !== actor.guildId) {
			throw new NotFoundError('That user is not a member of this circle');
		}

		await tx
			.update(guildMembers)
			.set({ role })
			.where(eq(guildMembers.userId, targetUserId));
	});
}

export async function removeMember(actorId: string, targetUserId: string) {
	await db.transaction(async (tx) => {
		const actor = await currentMembership(tx, actorId);
		if (!actor || (actor.role !== 'owner' && actor.role !== 'officer')) {
			throw new ForbiddenError('Only owners and officers can remove members');
		}

		const [target] = await tx
			.select()
			.from(guildMembers)
			.where(eq(guildMembers.userId, targetUserId))
			.limit(1);

		if (!target || target.guildId !== actor.guildId) {
			throw new NotFoundError('That user is not a member of this circle');
		}
		if (target.role === 'owner') {
			throw new ForbiddenError('Transfer ownership before removing the owner');
		}

		await tx.delete(guildMembers).where(eq(guildMembers.userId, targetUserId));
	});
}

export async function disbandGuild(userId: string) {
	await db.transaction(async (tx) => {
		const membership = await currentMembership(tx, userId);
		if (!membership) throw new NotFoundError('You are not in a circle');

		const [guild] = await tx.select().from(guilds).where(eq(guilds.id, membership.guildId)).limit(1);
		if (!guild || guild.ownerId !== userId) {
			throw new ForbiddenError('Only the owner can disband the circle');
		}

		// Soft delete keeps historical invitation/order data intact.
		await tx
			.update(guilds)
			.set({ status: 'disbanded', updatedAt: new Date() })
			.where(eq(guilds.id, guild.id));
		await tx.delete(guildMembers).where(eq(guildMembers.guildId, guild.id));
		await tx
			.update(guildInvitations)
			.set({ status: 'cancelled' })
			.where(and(eq(guildInvitations.guildId, guild.id), eq(guildInvitations.status, 'pending')));
	});
}

export async function updateGuild(
	actorId: string,
	guildId: string,
	update: Partial<Pick<GuildInput, 'name' | 'description' | 'visibility' | 'iconKey' | 'bannerKey'>>
) {
	const replaced: (string | null)[] = [];

	const updated = await db.transaction(async (tx) => {
		const actor = await currentMembership(tx, actorId);
		if (!actor || actor.role !== 'owner' || actor.guildId !== guildId) {
			throw new ForbiddenError('Only the owner can edit circle settings');
		}

		const [existing] = await tx
			.select({ iconKey: guilds.iconKey, bannerKey: guilds.bannerKey })
			.from(guilds)
			.where(eq(guilds.id, guildId))
			.limit(1);

		const [row] = await tx
			.update(guilds)
			.set({ ...update, updatedAt: new Date() })
			.where(eq(guilds.id, guildId))
			.returning();

		if (!row) throw new NotFoundError('Circle not found');

		if (existing) {
			const nextIcon = update.iconKey === undefined ? existing.iconKey : update.iconKey;
			const nextBanner = update.bannerKey === undefined ? existing.bannerKey : update.bannerKey;
			if (nextIcon !== existing.iconKey) replaced.push(existing.iconKey);
			if (nextBanner !== existing.bannerKey) replaced.push(existing.bannerKey);
		}

		return row;
	});

	for (const key of replaced) await deleteReplacedObject(key);
	return updated;
}

export async function searchGuildMemberCandidates(guildId: string, query: string) {
	if (query.length < 2) return [];
	const rows = await db
		.select({
			userId: user.id,
			slug: profiles.slug,
			displayName: profiles.displayName
		})
		.from(profiles)
		.innerJoin(user, eq(user.id, profiles.userId))
		.where(sql`(${profiles.slug} ILIKE ${`%${query}%`} OR ${profiles.displayName} ILIKE ${`%${query}%`})`)
		.limit(10);

	const members = await db
		.select({ userId: guildMembers.userId })
		.from(guildMembers)
		.where(eq(guildMembers.guildId, guildId));
	const memberIds = new Set(members.map((m) => m.userId));
	return rows.filter((r) => !memberIds.has(r.userId));
}
