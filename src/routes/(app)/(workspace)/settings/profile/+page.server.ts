import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { profileIdentitySchema, profileVisibilitySchema } from '#lib/schemas/profile';
import {
	getDiscordAccountByUserId,
	getProfileByUserId,
	setProfileAvatar,
	setProfileBanner,
	setProfileVisibility,
	updateProfileIdentity
} from '#lib/server/services/profiles';
import { isValidSlug } from '#lib/server/utils/slug';
import { listOwnedByKind, setEquippedCosmetic, type CosmeticKind } from '#lib/server/services/cosmetics';
import { assertOwnObjectKey, presignDownload } from '#lib/server/storage';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const profile = await getProfileByUserId(locals.user.id);
	const [owned, discord, bannerUrl, uploadedAvatarUrl] = await Promise.all([
		listOwnedByKind(locals.user.id),
		getDiscordAccountByUserId(locals.user.id),
		profile.bannerKey ? presignDownload(profile.bannerKey) : null,
		profile.avatarKey ? presignDownload(profile.avatarKey) : null
	]);

	return { profile, discord, owned, bannerUrl, avatarUrl: uploadedAvatarUrl ?? discord?.avatarUrl ?? locals.user.image ?? null };
};

export const actions: Actions = {
	identity: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const user = locals.user;
		const data = await request.formData();
		const values = {
			username: typeof data.get('username') === 'string' ? String(data.get('username')) : '',
			displayName: typeof data.get('displayName') === 'string' ? String(data.get('displayName')) : '',
			bio: typeof data.get('bio') === 'string' ? String(data.get('bio')) : ''
		};
		const parsed = profileIdentitySchema.safeParse(values);
		if (!parsed.success) {
			return fail(422, {
				error: 'Please check the highlighted profile details',
				errors: parsed.error.flatten().fieldErrors,
				values
			});
		}
		if (!isValidSlug(parsed.data.username)) {
			return fail(422, {
				error: 'That username is reserved',
				errors: { username: ['Choose a different username'] },
				values
			});
		}

		try {
			rateLimit(`profile-identity:${user.id}`, 10, 60_000);
			await updateProfileIdentity(user.id, parsed.data);
			return { ok: true };
		} catch (err) {
			if (err instanceof AppError) {
				return fail(err.status, {
					error: err.message,
					...(err.code === 'username_taken' ? { errors: { username: [err.message] } } : {}),
					values
				});
			}
			console.error(err);
			return fail(500, { error: 'Could not save your profile', values });
		}
	},

	avatarReset: async ({ locals }) => {
		if (!locals.user) redirect(302, '/login');
		try {
			rateLimit(`profile-avatar:${locals.user.id}`, 10, 60_000);
			await setProfileAvatar(locals.user.id, null);
			return { ok: true };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not restore your Discord avatar' });
		}
	},

	visibility: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const user = locals.user;
		const data = await request.formData();

		const parsed = profileVisibilitySchema.safeParse({ visibility: data.get('visibility') });
		if (!parsed.success) {
			return fail(422, { error: 'Invalid input' });
		}

		try {
			rateLimit(`profile-visibility:${user.id}`, 10, 60_000);
			await setProfileVisibility(user.id, parsed.data.visibility);
			return { ok: true };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not update visibility' });
		}
	},

	wallpaper: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const user = locals.user;
		const data = await request.formData();
		const key = data.get('key');

		if (typeof key !== 'string' || !key) return fail(422, { error: 'Missing file key' });

		try {
			rateLimit(`wallpaper:${user.id}`, 10, 60_000);
			assertOwnObjectKey(user.id, 'banner', key);
			await setProfileBanner(user.id, key);
			return { ok: true };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not save the wallpaper' });
		}
	},

	equip: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const user = locals.user;
		const data = await request.formData();
		const cosmeticId = data.get('cosmeticId');
		const kind = data.get('kind');

		if (typeof kind !== 'string' || !['frame', 'wallpaper', 'badge'].includes(kind)) {
			return fail(422, { error: 'Invalid kind' });
		}

		try {
			rateLimit(`equip:${user.id}`, 20, 60_000);
			await setEquippedCosmetic(
				user.id,
				kind as CosmeticKind,
				typeof cosmeticId === 'string' && cosmeticId ? cosmeticId : null
			);
			return { ok: true };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not equip' });
		}
	}
};
