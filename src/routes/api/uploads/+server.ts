import type { RequestHandler } from './$types';
import { assertOwnObjectKey, deleteObject, presignUpload, scrubStoredSvg, verifyStoredObject, type UploadKind } from '#lib/server/storage';
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
		await rateLimit(`upload:${locals.user.id}`, 20, 60_000);

		const body = (await request.json()) as { kind?: string; contentType?: string; sizeBytes?: number; scope?: string };
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
		if (body.kind === 'icon' || body.scope === 'circle') {
			const membership = await getMembership(locals.user.id);
			if (!membership || membership.membership.role !== 'owner') {
				return Response.json({ error: 'Only the circle owner can set the circle artwork' }, { status: 403 });
			}
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

	const body = (await request.json()) as { kind?: string; key?: string; scope?: string };
	const kind = body.kind;
	const key = body.key;
	// Circle artwork shares its upload kinds with the profile, so the scope says
	// which record a finished upload belongs to.
	const scope = body.scope === 'circle' ? 'circle' : 'profile';

	if ((kind !== 'banner' && kind !== 'avatar' && kind !== 'icon' && kind !== 'audio' && kind !== 'cursor' && kind !== 'background') || typeof key !== 'string') {
		return Response.json({ error: 'Invalid request' }, { status: 422 });
	}

	try {
		assertOwnObjectKey(locals.user.id, kind as UploadKind, key);

		// The bytes came straight from the browser to storage: verify the stored
		// signature and content type before any record is allowed to reference
		// them. A mismatched object is an orphan we just received, so it is
		// deleted on the spot instead of being cleaned up later.
		if (!(await verifyStoredObject(key, kind as UploadKind))) {
			await deleteObject(key).catch(() => undefined);
			return Response.json({ error: 'The uploaded file does not match its type' }, { status: 415 });
		}
		// Avatar SVGs get a second sanitize pass server-side, after the browser
		// already sanitized them once; a non-SVG object is a no-op here.
		if (kind === 'avatar') await scrubStoredSvg(key).catch(() => undefined);

		if (kind === 'banner' && scope === 'profile') {
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
		} else if (kind === 'icon' || scope === 'circle') {
			const membership = await getMembership(locals.user.id);
			if (!membership || membership.membership.role !== 'owner') {
				return Response.json({ error: 'Only the circle owner can set the circle artwork' }, { status: 403 });
			}
			await updateGuild(
				locals.user.id,
				membership.guild.id,
				kind === 'icon' ? { iconKey: key } : { bannerKey: key }
			);
		} else {
			return Response.json({ error: 'Invalid request' }, { status: 422 });
		}
		return Response.json({ ok: true, key });
	} catch (err) {
		if (err instanceof AppError) return Response.json({ error: err.message }, { status: err.status });
		console.error(err);
		return Response.json({ error: 'Could not attach the file' }, { status: 500 });
	}
};