import type { RequestHandler } from './$types';
import { isPlatformAdmin } from '#lib/server/services/admin';
import { buildMediaReport, enqueueMediaCleanup, processMediaCleanupQueue } from '#lib/server/media/cleanup';

/**
 * Storage report (GET) and cleanup actions (POST), platform-admin only.
 *
 * GET returns the dry-run report: totals, bytes by category, largest assets,
 * cleanup queue state and unreferenced objects. Nothing is deleted here.
 *
 * POST { action: 'process' } retries pending cleanup jobs now.
 * POST { action: 'enqueue-orphans', limit?: number } queues up to `limit`
 * unreferenced objects (max 500 per call) for deletion. Every queued key is
 * re-verified against live database references before it is removed, so this
 * can never delete a file that raced back into use.
 */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });
	if (!(await isPlatformAdmin(locals.user.id))) {
		return Response.json({ error: 'Admin access required' }, { status: 403 });
	}

	return Response.json(await buildMediaReport());
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });
	if (!(await isPlatformAdmin(locals.user.id))) {
		return Response.json({ error: 'Admin access required' }, { status: 403 });
	}

	const body = (await request.json().catch(() => ({}))) as { action?: string; limit?: number };

	if (body.action === 'process') {
		await processMediaCleanupQueue();
		return Response.json({ ok: true });
	}

	if (body.action === 'enqueue-orphans') {
		const limit = Math.min(Math.max(body.limit ?? 100, 1), 500);
		const report = await buildMediaReport();
		const queued = await enqueueMediaCleanup(report.orphanCandidates.slice(0, limit));
		await processMediaCleanupQueue();
		return Response.json({ ok: true, queued });
	}

	return Response.json({ error: 'Unknown action' }, { status: 422 });
};