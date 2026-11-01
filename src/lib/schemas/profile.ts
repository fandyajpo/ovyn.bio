import { z } from 'zod';

/** Identity (name, username, bio, avatar) is Discord-synced — the only
 *  user-editable profile page settings are visibility and the wallpaper. */
export const profileVisibilitySchema = z.object({
	visibility: z.enum(['public', 'private'])
});
