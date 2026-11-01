import { z } from 'zod';

export const guildCreateSchema = z.object({
	name: z.string().trim().min(2).max(50),
	description: z.string().trim().max(500).nullish(),
	visibility: z.enum(['public', 'private'])
});

export const guildUpdateSchema = z.object({
	name: z.string().trim().min(2).max(50),
	description: z.string().trim().max(500).nullish(),
	visibility: z.enum(['public', 'private'])
});

export type GuildCreate = z.infer<typeof guildCreateSchema>;
export type GuildUpdate = z.infer<typeof guildUpdateSchema>;
