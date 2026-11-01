import type { RequestHandler } from './$types';
import { assertOwnObjectKey, presignUpload, type UploadKind } from '#lib/server/storage';
import { setProfileMedia } from '#lib/server/services/profiles';
import { getMembership, updateGuild } from '#lib/server/services/guilds';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';

/** Step 1 of the upload flow: validate + hand out a presigned PUT URL. */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

	try {
		rateLimit(`upload:${locals.user.id}`, 20, 60_000);

		const body = (await request.json()) as { kind?: string; contentType?: string; sizeBytes?: number };
		if (!body.kind || !body.contentType || typeof body.sizeBytes !== 'number') {
			return Response.json({ error: 'Invalid request' }, { status: 422 });
		}

		const { key, uploadUrl } = await presignUpload(
			locals.user.id,
			body.kind as UploadKind,
			body.contentType,
			body.sizeBytes
		);
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

	if ((kind !== 'avatar' && kind !== 'banner' && kind !== 'icon') || typeof key !== 'string') {
		return Response.json({ error: 'Invalid request' }, { status: 422 });
	}

	try {
		assertOwnObjectKey(locals.user.id, kind as UploadKind, key);

		if (kind === 'avatar') {
			await setProfileMedia(locals.user.id, { avatarKey: key });
		} else if (kind === 'banner') {
			await setProfileMedia(locals.user.id, { bannerKey: key });
		} else {
			const membership = await getMembership(locals.user.id);
			if (!membership || membership.membership.role !== 'owner') {
				return Response.json({ error: 'Only the guild owner can set the icon' }, { status: 403 });
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
