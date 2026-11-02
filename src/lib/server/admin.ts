import { error, redirect } from '@sveltejs/kit';
import { isPlatformAdmin } from '#lib/server/services/admin';

export async function requirePlatformAdmin(userId: string | null | undefined): Promise<void> {
	if (!userId) redirect(302, '/login');
	if (!(await isPlatformAdmin(userId))) error(403, 'Admin access is restricted to configured Discord accounts.');
}
