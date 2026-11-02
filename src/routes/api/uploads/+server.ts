import type { RequestHandler } from './$types';
import { assertOwnObjectKey, presignUpload, type UploadKind } from '#lib/server/storage';
import { setProfileAudioKey, setProfileAvatar, setProfileBackgroundKey, setProfileBanner, setProfileCursorKey } from '#lib/server/services/profiles';
import { getMembership, updateGuild } from '#lib/server/services/guilds';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';
import { isPlatformAdmin } from '#lib/server/services/admin';
import { getUserPlan } from '#lib/server/services/billing';

/** Step 1 of the upload flow: validate + hand out a presigned PUT URL. */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

	try {
		rateLimit(`upload:${locals.user.id}`, 20, 60_000);

		const body = (await request.json()) as { kind?: string; contentType?: string; sizeBytes?: number };
		if (
			(body.kind !== 'banner' && body.kind !== 'avatar' && body.kind !== 'icon' && body.kind !== 'cosmetic' && body.kind !== 'audio' && body.kind !== 'cursor' && body.kind !== 'background') ||
			!body.contentType ||
			typeof body.sizeBytes !== 'number'
		) {
			return Response.json({ error: 'Invalid request' }, { status: 422 });
		}
		if (body.kind === 'cosmetic' && !(await isPlatformAdmin(locals.user.id))) {
			return Response.json({ error: 'Admin access required' }, { status: 403 });
		}

		const kind: UploadKind = body.kind;
		if (kind === 'cursor' && (await getUserPlan(locals.user.id)).tier !== 'premium') {
			return Response.json({ error: 'Custom cursor effects are a Premium feature' }, { status: 403 });
		}
		const { key, uploadUrl } = await presignUpload(locals.user.id, kind, body.contentType, body.sizeBytes);
		return Response.json({ key, uploadUrl });
	} catch (err) {
		if (err instanceof AppError) return Response.json({ error: err.message }, { status: err.status });
		console.error(err);
		return Response.json({ error: 'Upload rejected' }, { status: 500 });
	}
};

/** Step 2: confirm the key after a successful upload (ownership verified). */
export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

	const body = (await request.json()) as { kind?: string; key?: string };
	const kind = body.kind;
	const key = body.key;

	if ((kind !== 'banner' && kind !== 'avatar' && kind !== 'icon' && kind !== 'audio' && kind !== 'cursor' && kind !== 'background') || typeof key !== 'string') {
		return Response.json({ error: 'Invalid request' }, { status: 422 });
	}

	try {
		assertOwnObjectKey(locals.user.id, kind as UploadKind, key);

		if (kind === 'banner') {
			// The profile wallpaper.
			await setProfileBanner(locals.user.id, key);
		} else if (kind === 'avatar') {
			await setProfileAvatar(locals.user.id, key);
		} else if (kind === 'audio') {
			await setProfileAudioKey(locals.user.id, key);
		} else if (kind === 'cursor') {
			if ((await getUserPlan(locals.user.id)).tier !== 'premium') {
				return Response.json({ error: 'Custom cursor effects are a Premium feature' }, { status: 403 });
			}
			await setProfileCursorKey(locals.user.id, key);
		} else if (kind === 'background') {
			await setProfileBackgroundKey(locals.user.id, key);
		} else {
			const membership = await getMembership(locals.user.id);
			if (!membership || membership.membership.role !== 'owner') {
				return Response.json({ error: 'Only the circle owner can set the icon' }, { status: 403 });
			}
			await updateGuild(locals.user.id, membership.guild.id, { iconKey: key });
		}
		return Response.json({ ok: true, key });
	} catch (err) {
		if (err instanceof AppError) return Response.json({ error: err.message }, { status: err.status });
		console.error(err);
		return Response.json({ error: 'Could not attach the file' }, { status: 500 });
	}
};