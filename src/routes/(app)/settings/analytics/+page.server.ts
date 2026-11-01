import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProfileAnalytics } from '#lib/server/services/engagement';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	return { analytics: await getProfileAnalytics(locals.user.id) };
};
