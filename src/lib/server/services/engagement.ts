import { and, count, countDistinct, desc, eq, gte, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { db } from '#lib/server/db';
import {
	dailyCheckins,
	discordAccounts,
	profileViews,
	profiles,
	referralCodes,
	referrals,
	userRewards
} from '#lib/server/db/schema';
import { user } from '#lib/server/db/schema/auth';
import { ConflictError, NotFoundError } from '#lib/server/utils/errors';

const DAILY_POINTS = 10;
const WEEKLY_STREAK_BONUS = 50;
const REFERRAL_POINTS = 100;

function utcDate(date = new Date()): string {
	return date.toISOString().slice(0, 10);
}

function previousDate(date: string): string {
	const value = new Date(`${date}T00:00:00.000Z`);
	value.setUTCDate(value.getUTCDate() - 1);
	return utcDate(value);
}

export async function getRewardSummary(userId: string) {
	const [rewards] = await db
		.select()
		.from(userRewards)
		.where(eq(userRewards.userId, userId))
		.limit(1);

	const today = utcDate();
	const lastCheckinDate = rewards?.lastCheckinDate ?? null;
	const streakIsActive = lastCheckinDate === today || lastCheckinDate === previousDate(today);

	return {
		points: rewards?.points ?? 0,
		streakCount: streakIsActive ? rewards?.streakCount ?? 0 : 0,
		checkedInToday: lastCheckinDate === today,
		lastCheckinDate
	};
}

/** Atomic once-per-UTC-day check-in with streak and points reward. */
export async function claimDailyCheckin(userId: string) {
	return db.transaction(async (tx) => {
		await tx.execute(sql`SELECT id FROM "user" WHERE id = ${userId} FOR UPDATE`);
		await tx.insert(userRewards).values({ userId }).onConflictDoNothing();

		const [state] = await tx
			.select()
			.from(userRewards)
			.where(eq(userRewards.userId, userId))
			.for('update')
			.limit(1);
		if (!state) throw new NotFoundError('Rewards account not found');

		const today = utcDate();
		if (state.lastCheckinDate === today) {
			return { alreadyCheckedIn: true, points: state.points, streakCount: state.streakCount, pointsEarned: 0 };
		}

		const streakCount = state.lastCheckinDate === previousDate(today) ? state.streakCount + 1 : 1;
		const pointsEarned = DAILY_POINTS + (streakCount % 7 === 0 ? WEEKLY_STREAK_BONUS : 0);

		await tx.insert(dailyCheckins).values({ userId, checkinDate: today, streakCount, pointsEarned });
		await tx
			.update(userRewards)
			.set({
				points: state.points + pointsEarned,
				streakCount,
				lastCheckinDate: today,
				updatedAt: new Date()
			})
			.where(eq(userRewards.userId, userId));

		// Referral credits are earned only after the invitee completes their
		// first daily check-in, preventing signup-only farming.
		const [referral] = await tx
			.select()
			.from(referrals)
			.where(and(eq(referrals.referredUserId, userId), eq(referrals.status, 'pending')))
			.for('update')
			.limit(1);

		if (referral) {
			await tx.insert(userRewards).values({ userId: referral.referrerId }).onConflictDoNothing();
			await tx
				.update(userRewards)
				.set({ points: sql`${userRewards.points} + ${REFERRAL_POINTS}`, updatedAt: new Date() })
				.where(eq(userRewards.userId, referral.referrerId));
			await tx
				.update(userRewards)
				.set({ points: sql`${userRewards.points} + ${REFERRAL_POINTS}`, updatedAt: new Date() })
				.where(eq(userRewards.userId, userId));
			await tx
				.update(referrals)
				.set({ status: 'rewarded', rewardedAt: new Date() })
				.where(eq(referrals.id, referral.id));
		}

		return {
			alreadyCheckedIn: false,
			points: state.points + pointsEarned + (referral ? REFERRAL_POINTS : 0),
			streakCount,
			pointsEarned: pointsEarned + (referral ? REFERRAL_POINTS : 0)
		};
	});
}

export async function getOrCreateReferralCode(userId: string): Promise<string> {
	const [existing] = await db
		.select({ code: referralCodes.code })
		.from(referralCodes)
		.where(eq(referralCodes.userId, userId))
		.limit(1);
	if (existing) return existing.code;

	for (let attempt = 0; attempt < 5; attempt++) {
		const code = randomBytes(6).toString('base64url').toLowerCase();
		try {
			const [created] = await db
				.insert(referralCodes)
				.values({ userId, code })
				.onConflictDoNothing()
				.returning({ code: referralCodes.code });
			if (created) return created.code;

			const [raced] = await db
				.select({ code: referralCodes.code })
				.from(referralCodes)
				.where(eq(referralCodes.userId, userId))
				.limit(1);
			if (raced) return raced.code;
		} catch (err) {
			if ((err as { code?: string }).code !== '23505') throw err;
		}
	}
	throw new ConflictError('Could not create a referral code; please retry');
}

export async function getReferralSummary(userId: string) {
	const rows = await db
		.select({ status: referrals.status, total: count() })
		.from(referrals)
		.where(eq(referrals.referrerId, userId))
		.groupBy(referrals.status);

	return rows.reduce(
		(summary, row) => {
			const total = Number(row.total);
			summary.total += total;
			if (row.status === 'pending') summary.pending = total;
			if (row.status === 'rewarded') summary.rewarded = total;
			return summary;
		},
		{ total: 0, pending: 0, rewarded: 0 }
	);
}

/**
 * Attribute a recent new account to a referral code. Existing accounts
 * cannot claim referral rewards via a self-service link.
 */
export async function recordReferral(newUserId: string, code: string): Promise<void> {
	if (!/^[a-z0-9_-]{8}$/.test(code)) return;

	await db.transaction(async (tx) => {
		const [newUser] = await tx
			.select({ id: user.id, createdAt: user.createdAt })
			.from(user)
			.where(eq(user.id, newUserId))
			.limit(1);
		if (!newUser || Date.now() - newUser.createdAt.getTime() > 24 * 60 * 60 * 1000) return;

		const [referrer] = await tx
			.select({ userId: referralCodes.userId })
			.from(referralCodes)
			.where(eq(referralCodes.code, code))
			.limit(1);
		if (!referrer || referrer.userId === newUserId) return;

		await tx
			.insert(referrals)
			.values({ referrerId: referrer.userId, referredUserId: newUserId })
			.onConflictDoNothing({ target: referrals.referredUserId });
	});
}

/** Signed-in views only; same viewer/profile pair counts once per UTC day. */
export async function recordProfileView(profileUserId: string, viewerUserId: string | null) {
	if (!viewerUserId || viewerUserId === profileUserId) return;
	await db
		.insert(profileViews)
		.values({ profileUserId, viewerUserId, viewedOn: utcDate() })
		.onConflictDoNothing();
}

export async function getProfileAnalytics(userId: string) {
	const since = new Date();
	since.setUTCDate(since.getUTCDate() - 30);
	const sinceDate = utcDate(since);
	const range = and(eq(profileViews.profileUserId, userId), gte(profileViews.viewedOn, sinceDate));
	const [summary] = await db
		.select({
			views: count(),
			uniqueVisitors: countDistinct(profileViews.viewerUserId)
		})
		.from(profileViews)
		.where(range);

	const [daily, visitorRows] = await Promise.all([
		db
			.select({ date: profileViews.viewedOn, views: count() })
			.from(profileViews)
			.where(range)
			.groupBy(profileViews.viewedOn)
			.orderBy(profileViews.viewedOn),
		db
			.select({
				viewerUserId: profileViews.viewerUserId,
				slug: profiles.slug,
				displayName: profiles.displayName,
				globalName: discordAccounts.globalName,
				discordUsername: discordAccounts.username,
				avatarUrl: discordAccounts.avatarUrl,
				viewedOn: profileViews.viewedOn,
				createdAt: profileViews.createdAt
			})
			.from(profileViews)
			.innerJoin(profiles, eq(profiles.userId, profileViews.viewerUserId))
			.leftJoin(discordAccounts, eq(discordAccounts.userId, profileViews.viewerUserId))
			.where(and(range, eq(profiles.visibility, 'public')))
			.orderBy(desc(profileViews.createdAt))
			.limit(100)
	]);

	const seenVisitors = new Set<string>();
	const recentVisitors = visitorRows
		.filter((visitor) => {
			if (seenVisitors.has(visitor.viewerUserId)) return false;
			seenVisitors.add(visitor.viewerUserId);
			return true;
		})
		.slice(0, 20)
		.map((visitor) => ({
			slug: visitor.slug,
			displayName: visitor.displayName,
			globalName: visitor.globalName,
			discordUsername: visitor.discordUsername,
			avatarUrl: visitor.avatarUrl,
			viewedOn: visitor.viewedOn
		}));

	return {
		views: summary?.views ?? 0,
		uniqueVisitors: summary?.uniqueVisitors ?? 0,
		daily,
		recentVisitors
	};
}

export const REWARD_VALUES = {
	dailyCheckin: DAILY_POINTS,
	weeklyStreakBonus: WEEKLY_STREAK_BONUS,
	referral: REFERRAL_POINTS
} as const;
