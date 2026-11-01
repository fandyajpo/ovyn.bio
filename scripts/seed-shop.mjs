/**
 * Seeds the shop with starter cosmetics. For each item it creates a product
 * row (the price you sell at) and a matching cosmetics row (kind + art).
 *
 * Idempotent — re-running updates prices/descriptions instead of duplicating.
 * Cosmetic `asset_key` starts as your chosen S3 key; upload the art to Neon
 * Object Storage at that key (or wire an admin upload page later).
 *
 * Usage: npm run db:seed-shop
 */
import postgres from 'postgres';

process.loadEnvFile?.();

const url = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL (or DATABASE_URL_POOLED) must be set in .env');
	process.exit(1);
}

const sql = postgres(url, { prepare: false });

// name, kind, price (IDR), description, accentColor
const SEED = [
	{
		name: 'Lime Glow',
		kind: 'frame',
		price: 5000,
		description: 'A subtle electric lime ring for your avatar.',
		accent: '#D5FF35'
	},
	{
		name: 'Neon Ring',
		kind: 'frame',
		price: 10000,
		description: 'Cyan neon frame. Maximum internet energy.',
		accent: '#35D6FF'
	},
	{
		name: 'Sunset Frame',
		kind: 'frame',
		price: 10000,
		description: 'Warm gradient frame.',
		accent: '#FF9B35'
	},
	{
		name: 'Lime Fade Wallpaper',
		kind: 'wallpaper',
		price: 8000,
		description: 'Subtle lime wash for your profile header.',
		accent: '#D5FF35'
	},
	{
		name: 'Midnight Grid',
		kind: 'wallpaper',
		price: 12000,
		description: 'Dark grid pattern wallpaper.',
		accent: '#6B6F8A'
	},
	{
		name: 'OG Member',
		kind: 'badge',
		price: 0,
		description: 'For the early ones. Free forever.',
		accent: '#D5FF35'
	},
	{
		name: 'Verified Vibes',
		kind: 'badge',
		price: 15000,
		description: 'A little checkmark with personality.',
		accent: '#35D6FF'
	}
];

try {
	for (const item of SEED) {
		await sql.begin(async (tx) => {
			const [product] = await tx`
				INSERT INTO products (name, description, price, currency, active)
				VALUES (${item.name}, ${item.description}, ${item.price}, 'IDR', true)
				ON CONFLICT (name) DO UPDATE
				SET description = ${item.description}, price = ${item.price}, active = true
				RETURNING id
			`;

			await tx`
				INSERT INTO cosmetics (id, kind, asset_key, accent_color)
				VALUES (${product.id}, ${item.kind}, ${`cosmetics/${item.kind}s/${item.name.toLowerCase().replace(/\s+/g, '-')}.png`}, ${item.accent})
				ON CONFLICT (id) DO UPDATE
				SET kind = ${item.kind}, accent_color = ${item.accent}, updated_at = now()
			`;
		});
	}

	const [{ count }] = await sql`SELECT count(*)::int AS count FROM cosmetics`;
	console.log(`Seed complete: ${count} cosmetics in the shop.`);
	console.log("Each cosmetic's asset_key points at cosmetics/<kind>/<slug>.png in your Neon Object Storage bucket — upload the art there.");
} catch (err) {
	console.error('Seed failed:', err instanceof Error ? err.message : err);
	process.exitCode = 1;
} finally {
	await sql.end();
}
