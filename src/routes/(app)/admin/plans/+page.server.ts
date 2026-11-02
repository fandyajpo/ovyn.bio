import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requirePlatformAdmin } from '#lib/server/admin';
import { listAdminPlanUsers, setPlanOverride } from '#lib/server/services/plan-overrides';
import { AppError } from '#lib/server/utils/errors';

const TIERS = ['free', 'premium', 'default'] as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	await requirePlatformAdmin(locals.user?.id);
	const query = url.searchParams.get('q') ?? '';
	return { users: await listAdminPlanUsers(query), query };
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
			console.error(err);
			return fail(500, { error: 'Could not change that plan' });
		}
	}
};
