import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$app/env/private';
import { getFeatureFlags } from '#lib/server/services/settings';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/account');

	const flags = await getFeatureFlags();
	const googleConfigured = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
	const discordConfigured = Boolean(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET);

	return {
		credentialLogin: flags['auth.credentialLogin'],
		forgotPassword: flags['auth.forgotPassword'],
		googleConfigured,
		googleEnabled: googleConfigured && flags['auth.google'],
		discordConfigured,
		discordEnabled: discordConfigured && flags['auth.discord']
	};
};