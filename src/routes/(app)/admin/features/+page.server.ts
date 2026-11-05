import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requirePlatformAdmin } from '#lib/server/admin';
import { readFeatureFlagRows, setFeatureFlag, type FeatureFlagKey } from '#lib/server/services/settings';
import { AppError } from '#lib/server/utils/errors';

/** Postgres reports a missing migration as 42P01 (undefined_table). */
function isMissingTable(err: unknown): boolean {
	return Boolean(
		err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === '42P01'
	);
}

function defaultFlags(): Record<FeatureFlagKey, boolean> {
	return {
		'auth.forgotPassword': true,
		'auth.credentialLogin': true,
		'auth.google': true,
		'auth.discord': true
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	await requirePlatformAdmin(locals.user?.id);

	const flags = defaultFlags();
	try {
		const rows = await readFeatureFlagRows();
		for (const row of rows) {
			if (row.key in flags) flags[row.key as FeatureFlagKey] = row.enabled;
		}
		return { flags, needsMigration: false };
	} catch (err) {
		if (isMissingTable(err)) return { flags, needsMigration: true };
		throw err;
	}
};

export const actions: Actions = {
	setFlag: async ({ request, locals }) => {
		await requirePlatformAdmin(locals.user?.id);
		const adminId = locals.user?.id;
		if (!adminId) return fail(403, { error: 'Admin access required' });

		const data = await request.formData();
		const key = String(data.get('key') ?? '').trim();
		const enabled = data.get('enabled') === 'on';

		if (!(key in defaultFlags())) return fail(422, { error: 'Unknown feature' });

		try {
			await setFeatureFlag(key as FeatureFlagKey, enabled, adminId);
			return { ok: `${enabled ? 'Enabled' : 'Disabled'}: ${key.replace('auth.', '')}.` };
		} catch (err) {
			if (isMissingTable(err)) {
				return fail(503, { error: 'Run pnpm run db:migrate to create the feature_flags table' });
			}
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not change that feature' });
		}
	}
};