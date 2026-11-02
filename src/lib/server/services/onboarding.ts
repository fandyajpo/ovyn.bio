import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { profiles } from '#lib/server/db/schema';
import type { OnboardingInput } from '#lib/schemas/onboarding';
import { NotFoundError } from '#lib/server/utils/errors';

/** Saves the onboarding answers and marks the account as set up. */
export async function saveOnboarding(userId: string, input: OnboardingInput): Promise<void> {
	const [updated] = await db
		.update(profiles)
		.set({
			persona: input.persona,
			foundVia: input.foundVia,
			onboardedAt: new Date(),
			updatedAt: new Date()
		})
		.where(eq(profiles.userId, userId))
		.returning({ id: profiles.id });
	if (!updated) throw new NotFoundError('Profile not found');
}
