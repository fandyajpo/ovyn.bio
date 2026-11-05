import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requirePlatformAdmin } from '#lib/server/admin';
import { listAdminPlanUsers, setPlanOverride } from '#lib/server/services/plan-overrides';
import { setAccountStatus } from '#lib/server/services/admin';
import { AppError } from '#lib/server/utils/errors';

const TIERS = ['free', 'premium', 'default'] as const;

/** Postgres reports a missing migration as 42P01 (undefined_table). */
function isMissingTable(err: unknown): boolean {
	return Boolean(
		err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === '42P01'
	);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	await requirePlatformAdmin(locals.user?.id);
	const query = url.searchParams.get('q') ?? '';
	try {
		return { users: await listAdminPlanUsers(query), query, needsMigration: false };
	} catch (err) {
		if (isMissingTable(err)) return { users: [], query, needsMigration: true };
		throw err;
	}
};

export const actions: Actions = {
	setPlan: async ({ request, locals }) => {
		await requirePlatformAdmin(locals.user?.id);
		const adminId = locals.user?.id;
		if (!adminId) return fail(403, { error: 'Admin access required' });

		const data = await request.formData();
		const userId = String(data.get('userId') ?? '').trim();
		const tier = String(data.get('tier') ?? '');
		const note = String(data.get('note') ?? '').trim();

		if (!userId || !TIERS.includes(tier as (typeof TIERS)[number])) {
			return fail(422, { error: 'Invalid plan change' });
		}

		try {
			await setPlanOverride({
				adminUserId: adminId,
				targetUserId: userId,
				tier: tier === 'default' ? null : (tier as 'free' | 'premium'),
				note
			});
			return {
				ok:
					tier === 'default'
						? 'Override cleared. Purchases apply again.'
						: `Plan set to ${tier}.`
			};
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			if (isMissingTable(err)) {
				return fail(503, { error: 'Run pnpm run db:migrate to create the plan_overrides table' });
			}
			console.error(err);
			return fail(500, { error: 'Could not change that plan' });
		}
	},

	setStatus: async ({ request, locals }) => {
		await requirePlatformAdmin(locals.user?.id);
		const adminId = locals.user?.id;
		if (!adminId) return fail(403, { error: 'Admin access required' });

		const data = await request.formData();
		const userId = String(data.get('userId') ?? '').trim();
		const status = data.get('status') === 'suspended' ? 'suspended' : 'active';

		if (!userId) return fail(422, { error: 'Invalid account' });
		if (userId === adminId) return fail(422, { error: 'You cannot suspend your own account' });

		try {
			await setAccountStatus(userId, status);
			return {
				ok:
					status === 'suspended'
						? 'Account suspended. They lose access on their next request.'
						: 'Account restored.'
			};
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not update that account' });
		}
	}
};
