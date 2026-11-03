import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db';
import { discordAccounts } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getProfileByUserId } from '#lib/server/services/profiles';
import { presignDownload } from '#lib/server/storage';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	// The identity card names the sign-in provider, but its picture is the
	// ovyn profile avatar from the database.
	const [discord, profile] = await Promise.all([
		db.select().from(discordAccounts).where(eq(discordAccounts.userId, locals.user.id)).limit(1),
		getProfileByUserId(locals.user.id)
	]);

	return {
		discord: discord ?? null,
		userName: locals.user.name,
		avatarUrl: profile.avatarKey ? await presignDownload(profile.avatarKey) : null
	};
};