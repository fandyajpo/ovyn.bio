import type { RequestHandler } from './$types';
import { listPublicProfileSlugs } from '#lib/server/services/profiles';
import { TtlCache } from '#lib/server/utils/cache';

// Private profiles never appear here: the query filters on public visibility.
const ORIGIN = 'https://ovyn.me';
const STATIC_PATHS = ['', 'discover', 'shop', 'login', 'terms', 'privacy'];

// The slug list changes rarely; one soft query per five minutes per instance
// keeps crawlers from hitting the database on every fetch.
const slugCache = new TtlCache<string[]>(5 * 60_000, 2);

export const GET: RequestHandler = async () => {
	let slugs = slugCache.get('slugs');
	if (!slugs) {
		slugs = await listPublicProfileSlugs();
		slugCache.set('slugs', slugs);
	}

	const urls = [
		...STATIC_PATHS.map((path) => `\t<url><loc>${ORIGIN}/${path}</loc></url>`),
		...slugs.map((slug) => `\t<url><loc>${ORIGIN}/${encodeURIComponent(slug)}</loc></url>`)
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'content-type': 'application/xml',
			'cache-control': 'public, max-age=3600'
		}
	});
};