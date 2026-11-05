import type { PageServerLoad } from './$types';

/** The reset token arrives as a query param on the link better-auth emails. */
export const load: PageServerLoad = async ({ url }) => ({
	token: url.searchParams.get('token'),
	expired: url.searchParams.get('error') === 'INVALID_TOKEN'
});