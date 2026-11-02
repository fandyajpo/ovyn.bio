import { z } from 'zod';

export const profileIdentitySchema = z.object({
	username: z
		.string()
		.trim()
		.toLowerCase()
		.regex(/^[a-z0-9](?:[a-z0-9._-]{0,30}[a-z0-9])$/, 'Use 2–32 lowercase letters, numbers, dots, underscores or hyphens'),
	displayName: z.string().trim().min(1, 'Display name is required').max(40, 'Display name must be 40 characters or fewer'),
	bio: z.string().trim().max(280, 'Bio must be 280 characters or fewer').transform((value) => value || null)
});

export const profileVisibilitySchema = z.object({
	visibility: z.enum(['public', 'private'])
});
