import { z } from 'zod';

export const PROFILE_THEME_IDS = ['default', 'midnight', 'bubblegum', 'ocean', 'forest'] as const;
export const profileThemeSchema = z.enum(PROFILE_THEME_IDS);

export const PROFILE_THEME_OPTIONS = [
	{ value: 'default', label: 'OVYN Original' },
	{ value: 'midnight', label: 'Midnight Grid' },
	{ value: 'bubblegum', label: 'Bubblegum After Dark' },
	{ value: 'ocean', label: 'Deep Ocean' },
	{ value: 'forest', label: 'Forest Club' }
] as const;

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
