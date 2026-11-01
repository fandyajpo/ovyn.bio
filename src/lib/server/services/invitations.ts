import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { guildInvitations, guildMembers, guilds } from '#lib/server/db/schema';
import { user } from '#lib/server/db/schema/auth';
import { profiles } from '#lib/server/db/schema';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '#lib/server/utils/errors';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type InvitationWithGuild = {
	invitation: typeof guildInvitations.$inferSelect;
	guild: { id: string; name: string; slug: string; iconKey: string | null };
	inviterName: string | null;
};

/** Lazily expire pending invitations that passed their expiry. */
async function expireStale(tx: Tx): Promise<void> {
	await tx
		.update(guildInvitations)
		.set({ status: 'expired' })
		.where(
			and(eq(guildInvitations.status, 'pending'), sql`${guildInvitations.expiresAt} < now()`)
		);
}

async function roleAtLeast(role: string): Promise<boolean> {
	return role === 'owner' || role === 'officer';
}

export async function createInvitation(
	inviterId: string,
	inviteeUserId: string
): Promise<typeof guildInvitations.$inferSelect> {
	if (inviterId === inviteeUserId) {
		throw new ValidationError('You cannot invite yourself');
	}

	return db.transaction(async (tx) => {
		const [actor] = await tx
			.select({ guildId: guildMembers.guildId, role: guildMembers.role })
			.from(guildMembers)
			.where(eq(guildMembers.userId, inviterId))
			.limit(1);

		if (!actor || !roleAtLeast(actor.role)) {
			throw new ForbiddenError('Only owners and officers can send invitations');
		}

		// Invitee must not already be in any guild (one guild per user).
		const [inviteeMembership] = await tx
			.select({ userId: guildMembers.userId })
			.from(guildMembers)
			.where(eq(guildMembers.userId, inviteeUserId))
			.limit(1);
		if (inviteeMembership) {
			throw new ConflictError('That user already belongs to a guild');
		}

		const [guild] = await tx.select().from(guilds).where(eq(guilds.id, actor.guildId)).limit(1);
		if (!guild || guild.status !== 'active') throw new NotFoundError('Guild not found');

		try {
			const [invitation] = await tx
				.insert(guildInvitations)
				.values({
					guildId: actor.guildId,
					inviterId,
					inviteeId: inviteeUserId,
					expiresAt: new Date(Date.now() + INVITATION_TTL_MS)
				})
				.returning();
			return invitation;
		} catch (err) {
			if ((err as { code?: string }).code === '23505') {
				throw new ConflictError('There is already a pending invitation for that user');
			}
			throw err;
		}
	});
}

export async function cancelInvitation(actorId: string, invitationId: string): Promise<void> {
	await db.transaction(async (tx) => {
		const [invitation] = await tx
			.select()
			.from(guildInvitations)
			.where(eq(guildInvitations.id, invitationId))
			.limit(1);
		if (!invitation) throw new NotFoundError('Invitation not found');

		const [actor] = await tx
			.select({ guildId: guildMembers.guildId, role: guildMembers.role })
			.from(guildMembers)
			.where(eq(guildMembers.userId, actorId))
			.limit(1);

		const authorized =
			invitation.inviterId === actorId ||
			(actor && actor.guildId === invitation.guildId && roleAtLeast(actor.role));

		if (!authorized) throw new ForbiddenError('You cannot cancel this invitation');

		if (invitation.status !== 'pending') {
			throw new ValidationError(`Invitation is already ${invitation.status}`);
		}

		await tx
			.update(guildInvitations)
			.set({ status: 'cancelled' })
			.where(eq(guildInvitations.id, invitationId));
	});
}

export async function rejectInvitation(inviteeId: string, invitationId: string): Promise<void> {
	const [invitation] = await db
		.select()
		.from(guildInvitations)
		.where(eq(guildInvitations.id, invitationId))
		.limit(1);
	if (!invitation || invitation.inviteeId !== inviteeId) {
		throw new NotFoundError('Invitation not found');
	}
	if (invitation.status !== 'pending') {
		throw new ValidationError(`Invitation is already ${invitation.status}`);
	}
	await db
		.update(guildInvitations)
		.set({ status: 'rejected' })
		.where(eq(guildInvitations.id, invitationId));
}

/**
 * Accept an invitation atomically. The user's membership row (guild_members
 * user_id PRIMARY KEY) plus the user-row lock guarantee that accepting two
 * invitations concurrently can never create two memberships.
 */
export async function acceptInvitation(
	inviteeId: string,
	invitationId: string
): Promise<typeof guilds.$inferSelect> {
	return db.transaction(async (tx) => {
		// Serialize with join/create flows.
		await tx.execute(sql`SELECT id FROM "user" WHERE id = ${inviteeId} FOR UPDATE`);
		await expireStale(tx);

		const [invitation] = await tx
			.select()
			.from(guildInvitations)
			.where(eq(guildInvitations.id, invitationId))
			.limit(1);

		if (!invitation || invitation.inviteeId !== inviteeId) {
			throw new NotFoundError('Invitation not found');
		}
		if (invitation.status !== 'pending') {
			throw new ValidationError(`This invitation is ${invitation.status}`);
		}
		if (invitation.expiresAt.getTime() < Date.now()) {
			await tx
				.update(guildInvitations)
				.set({ status: 'expired' })
				.where(eq(guildInvitations.id, invitationId));
			throw new ValidationError('This invitation has expired');
		}

		// Revalidate eligibility at accept-time.
		const [existingMembership] = await tx
			.select({ userId: guildMembers.userId })
			.from(guildMembers)
			.where(eq(guildMembers.userId, inviteeId))
			.limit(1);
		if (existingMembership) {
			throw new ConflictError(
				'You already belong to a guild. Leave your current guild before accepting this invitation.'
			);
		}

		const [guild] = await tx
			.select()
			.from(guilds)
			.where(and(eq(guilds.id, invitation.guildId), eq(guilds.status, 'active')))
			.limit(1);
		if (!guild) throw new NotFoundError('This guild no longer exists');

		await tx.insert(guildMembers).values({ userId: inviteeId, guildId: guild.id, role: 'member' });
		await tx
			.update(guildInvitations)
			.set({ status: 'accepted', acceptedAt: new Date() })
			.where(eq(guildInvitations.id, invitationId));

		return guild;
	});
}

export async function listMyInvitations(userId: string): Promise<InvitationWithGuild[]> {
	const rows = await db
		.select({
			invitation: guildInvitations,
			guild: { id: guilds.id, name: guilds.name, slug: guilds.slug, iconKey: guilds.iconKey },
			inviterName: profiles.displayName
		})
		.from(guildInvitations)
		.innerJoin(guilds, eq(guilds.id, guildInvitations.guildId))
		.leftJoin(profiles, eq(profiles.userId, guildInvitations.inviterId))
		.where(and(eq(guildInvitations.inviteeId, userId), eq(guildInvitations.status, 'pending')))
		.orderBy(desc(guildInvitations.createdAt));

	await db.transaction(async (tx) => expireStale(tx));
	return rows;
}

export async function listGuildInvitations(guildId: string) {
	return db
		.select({
			invitation: guildInvitations,
			inviteeSlug: profiles.slug,
			inviteeName: profiles.displayName
		})
		.from(guildInvitations)
		.innerJoin(profiles, eq(profiles.userId, guildInvitations.inviteeId))
		.where(eq(guildInvitations.guildId, guildId))
		.orderBy(desc(guildInvitations.createdAt))
		.limit(100);
}

export async function listUsernamesForInvite(guildId: string, query: string) {
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
