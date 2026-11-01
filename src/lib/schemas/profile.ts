import { z } from 'zod';

export const profileUpdateSchema = z.object({
	displayName: z.string().trim().min(1).max(50),
	slug: z
		.string()
		.trim()
		.min(2)
		.max(32)
		.regex(/^[a-z0-9._-]+$/, 'Only lowercase letters, numbers, dots, dashes and underscores'),
	bio: z.string().trim().max(500).nullish(),
	visibility: z.enum(['public', 'private'])
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
