import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { profileThemeSchema } from '#lib/schemas/profile';
import { getDiscordAccountByUserId, getProfileByUserId, setProfileAudioKey, setProfileAvatar, setProfileCursorKey, setProfileTheme } from '#lib/server/services/profiles';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';
import { presignDownload } from '#lib/server/storage';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const [profile, discord] = await Promise.all([
		getProfileByUserId(locals.user.id),
		getDiscordAccountByUserId(locals.user.id)
	]);
	const [bannerUrl, avatarUrl, audioUrl, cursorUrl] = await Promise.all([
		profile.bannerKey ? presignDownload(profile.bannerKey) : null,
		profile.avatarKey ? presignDownload(profile.avatarKey) : discord?.avatarUrl ?? null,
		profile.audioKey ? presignDownload(profile.audioKey) : null,
		profile.cursorKey ? presignDownload(profile.cursorKey) : null
	]);
	return { profile, avatarUrl, bannerUrl, audioUrl, cursorUrl };
};

export const actions: Actions = {
	avatarReset: async ({ locals }) => {
		if (!locals.user) redirect(302, '/login');
		try {
			rateLimit(`profile-avatar:${locals.user.id}`, 10, 60_000);
			await setProfileAvatar(locals.user.id, null);
			return { ok: 'Discord picture restored.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not restore your Discord avatar' });
		}
	},

	theme: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const data = await request.formData();
		const parsed = profileThemeSchema.safeParse(data.get('theme'));
		if (!parsed.success) return fail(422, { error: 'Choose a valid theme' });
		try {
			rateLimit(`profile-theme:${locals.user.id}`, 20, 60_000);
			await setProfileTheme(locals.user.id, parsed.data);
			return { ok: 'Theme saved.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not save your theme' });
		}
	},
	clearAudio: async ({ locals }) => {
		if (!locals.user) redirect(302, '/login');
		try {
			rateLimit(`profile-audio:${locals.user.id}`, 10, 60_000);
			await setProfileAudioKey(locals.user.id, null);
			return { ok: 'Audio removed.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not remove profile audio' });
		}
	},
	clearCursor: async ({ locals }) => {
		if (!locals.user) redirect(302, '/login');
		try {
			rateLimit(`profile-cursor:${locals.user.id}`, 10, 60_000);
			await setProfileCursorKey(locals.user.id, null);
			return { ok: 'Cursor removed.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not remove custom cursor' });
		}
	}
};
