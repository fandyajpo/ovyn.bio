import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { discordAccounts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const [discord] = await db
		.select()
		.from(discordAccounts)
		.where(eq(discordAccounts.userId, locals.user!.id))
		.limit(1);

	return { discord: discord ?? null };
};
