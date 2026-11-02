import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Remember referral attribution, then send visitors through OAuth sign-in. */
export const GET: RequestHandler = async ({ params, cookies, url }) => {
	cookies.set('ovyn_referral', params.code, {
		path: '/',
		httpOnly: true,
		secure: url.protocol === 'https:',
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30
	});
	redirect(302, '/login');
};
