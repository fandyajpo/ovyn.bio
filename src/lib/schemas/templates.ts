import { z } from 'zod';
import { profileThemeSchema } from './profile';

export const createProfileTemplateSchema = z.object({
	name: z.string().trim().min(2, 'Template name must have at least 2 characters').max(40),
	description: z.string().trim().max(160).transform((value) => value || null),
	theme: profileThemeSchema,
	isPublic: z.preprocess((value) => value === 'on' || value === true, z.boolean())
});

export const updateProfileTemplateVisibilitySchema = z.object({
	id: z.uuid(),
	isPublic: z.preprocess((value) => value === 'on' || value === true, z.boolean())
});

export type ProfileTemplateInput = z.infer<typeof createProfileTemplateSchema>;

export const profileTemplateIdSchema = z.object({ id: z.uuid() });
