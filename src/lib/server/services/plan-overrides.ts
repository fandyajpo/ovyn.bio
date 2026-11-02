import { desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { orders, payments, planOverrides, products, profiles, user } from '#lib/server/db/schema';
import { NotFoundError } from '#lib/server/utils/errors';

export type PlanOverrideTier = 'free' | 'premium';

export type AdminPlanRow = {
	id: string;
	name: string;
	email: string | null;
	slug: string | null;
	displayName: string | null;
	overrideTier: PlanOverrideTier | null;
	overrideNote: string | null;
	overrideUpdatedAt: Date | null;
	purchasedPremium: boolean;
	effectiveTier: PlanOverrideTier;
	source: 'override' | 'purchase' | 'free';
};

/** Accounts with their effective plan, for the admin plan switcher. */
export async function listAdminPlanUsers(rawQuery: string, limit = 40): Promise<AdminPlanRow[]> {
	const term = rawQuery.trim().slice(0, 80);
	const pattern = `%${term.replace(/[%_\\]/g, '\\$&')}%`;
	const filter = term
		? or(
				ilike(user.name, pattern),
				ilike(user.email, pattern),
				ilike(profiles.slug, pattern),
				ilike(profiles.displayName, pattern)
			)
		: undefined;

	const purchasedPremium = sql<boolean>`exists (
		select 1
		from ${orders} o
		inner join ${products} p on p.id = o.product_id
		inner join ${payments} pay on pay.order_id = o.id
		where o.user_id = ${user.id}
			and o.status = 'paid'
			and pay.status = 'succeeded'
			and p.category = 'plan'
	)`;

	const rows = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			slug: profiles.slug,
			displayName: profiles.displayName,
			overrideTier: planOverrides.tier,
			overrideNote: planOverrides.note,
			overrideUpdatedAt: planOverrides.updatedAt,
			purchasedPremium
		})
		.from(user)
		.leftJoin(profiles, eq(profiles.userId, user.id))
		.leftJoin(planOverrides, eq(planOverrides.userId, user.id))
		.where(filter)
		.orderBy(desc(user.createdAt))
		.limit(limit);

	return rows.map((row) => {
		const purchased = Boolean(row.purchasedPremium);
		const effectiveTier: PlanOverrideTier = row.overrideTier ?? (purchased ? 'premium' : 'free');
		return {
			...row,
			overrideTier: row.overrideTier ?? null,
			purchasedPremium: purchased,
			effectiveTier,
			source: row.overrideTier ? 'override' : purchased ? 'purchase' : 'free'
		};
	});
}

/** Sets or clears a manual plan override. A null tier falls back to purchases. */
export async function setPlanOverride(input: {
	adminUserId: string;
	targetUserId: string;
	tier: PlanOverrideTier | null;
	note?: string | null;
}): Promise<void> {
	const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, input.targetUserId)).limit(1);
	if (!target) throw new NotFoundError('Account not found');

	if (!input.tier) {
		await db.delete(planOverrides).where(eq(planOverrides.userId, input.targetUserId));
		return;
	}

	const note = input.note?.trim() ? input.note.trim().slice(0, 200) : null;
	await db
		.insert(planOverrides)
		.values({
			userId: input.targetUserId,
			tier: input.tier,
			note,
			grantedByUserId: input.adminUserId
		})
		.onConflictDoUpdate({
			target: planOverrides.userId,
			set: {
				tier: input.tier,
				note,
				grantedByUserId: input.adminUserId,
				updatedAt: new Date()
			}
		});
}
