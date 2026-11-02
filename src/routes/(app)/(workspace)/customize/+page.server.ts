import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { profileBackgroundSchema, profileUsernameColorSchema } from '#lib/schemas/profile';
import {
	getDiscordAccountByUserId,
	getProfileByUserId,
	setProfileAudioKey,
	setProfileAvatar,
	setProfileBackground,
	setProfileBackgroundKey,
	setProfileCursorKey,
	setProfileUsernameColor
} from '#lib/server/services/profiles';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';
import { presignDownload } from '#lib/server/storage';
import { getUserPlan } from '#lib/server/services/billing';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const [profile, discord, plan] = await Promise.all([
		getProfileByUserId(locals.user.id),
		getDiscordAccountByUserId(locals.user.id),
		getUserPlan(locals.user.id)
	]);
	const [bannerUrl, avatarUrl, audioUrl, cursorUrl, backgroundUrl] = await Promise.all([
		profile.bannerKey ? presignDownload(profile.bannerKey) : null,
		profile.avatarKey ? presignDownload(profile.avatarKey) : discord?.avatarUrl ?? locals.user.image ?? null,
		profile.audioKey ? presignDownload(profile.audioKey) : null,
		profile.cursorKey && plan.tier === 'premium' ? presignDownload(profile.cursorKey) : null,
		profile.backgroundKey ? presignDownload(profile.backgroundKey) : null
	]);
	return { profile, avatarUrl, bannerUrl, audioUrl, cursorUrl, backgroundUrl, plan };
};

export const actions: Actions = {
	avatarReset: async ({ locals }) => {
		if (!locals.user) redirect(302, '/login');
		try {
			rateLimit(`profile-avatar:${locals.user.id}`, 10, 60_000);
			await setProfileAvatar(locals.user.id, null);
			return { ok: 'Account picture restored.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not restore your account picture' });
		}
	},

	color: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const data = await request.formData();
		const parsed = profileUsernameColorSchema.safeParse(data.get('usernameColor'));
		if (!parsed.success) {
			return fail(422, { error: 'Use a six-digit hex colour like #CDBCF3, or leave it empty' });
		}
		try {
			rateLimit(`profile-color:${locals.user.id}`, 20, 60_000);
			await setProfileUsernameColor(locals.user.id, parsed.data);
			return { ok: parsed.data ? 'Username colour saved.' : 'Username colour reset.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not save your username colour' });
		}
	},

	background: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const data = await request.formData();
		const parsed = profileBackgroundSchema.safeParse({
			texture: data.get('texture'),
			fixed: data.get('fixed')
		});
		if (!parsed.success) return fail(422, { error: 'Pick a valid background texture' });
		try {
			rateLimit(`profile-background:${locals.user.id}`, 20, 60_000);
			await setProfileBackground(locals.user.id, parsed.data.texture, parsed.data.fixed);
			return { ok: 'Background saved.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not save your background' });
		}
	},

	clearBackgroundImage: async ({ locals }) => {
		if (!locals.user) redirect(302, '/login');
		try {
			rateLimit(`profile-background:${locals.user.id}`, 20, 60_000);
			await setProfileBackgroundKey(locals.user.id, null);
			return { ok: 'Background image removed.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not remove the background image' });
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
