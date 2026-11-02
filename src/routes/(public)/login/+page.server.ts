import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$app/env/private';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/account');
	return { googleEnabled: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) };
};
