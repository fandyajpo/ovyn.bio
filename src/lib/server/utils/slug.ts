/** Route segments that can never be a profile slug (they are real routes). */
export const RESERVED_SLUGS = new Set([
	'api',
	'login',
	'logout',
	'discover',
	'dashboard',
	'settings',
	'guild',
	'guilds',
	'billing',
	'checkout',
	'invitations',
	'webhooks',
	'uploads',
	'media',
	'static',
	'_app',
	'favicon.ico',
	'robots.txt',
	'sitemap.xml'
]);

export function normalizeSlug(raw: string): string {
	return raw
		.normalize('NFKD')
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/-{2,}/g, '-')
		.replace(/^[._-]+|[._-]+$/g, '');
}

export function isValidSlug(slug: string): boolean {
	return (
		slug.length >= 2 &&
		slug.length <= 32 &&
		!/^[._-]/.test(slug) &&
		!/[._-]$/.test(slug) &&
		/^[a-z0-9._-]+$/.test(slug) &&
		!RESERVED_SLUGS.has(slug)
	);
}
