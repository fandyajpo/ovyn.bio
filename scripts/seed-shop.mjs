/**
 * Seeds the shop with starter cosmetics and the lifetime Premium plan.
 *
 * Idempotent - re-running updates starter values and restores bundled SVG art.
 * Cosmetic artwork is served from `static/cosmetics` until an admin replaces
 * it with an upload to Neon Object Storage.
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
		assetKey: 'static/cosmetics/frames/lime-glow.svg',
		price: 5000,
		pointsPrice: 250,
		description: 'A subtle electric lime ring for your avatar.',
		accent: '#D5FF35'
	},
	{
		name: 'Neon Ring',
		kind: 'frame',
		assetKey: 'static/cosmetics/frames/neon-ring.svg',
		price: 10000,
		pointsPrice: 400,
		description: 'Cyan neon frame. Maximum internet energy.',
		accent: '#35D6FF'
	},
	{
		name: 'Sunset Frame',
		kind: 'frame',
		assetKey: 'static/cosmetics/frames/sunset-frame.svg',
		price: 10000,
		pointsPrice: 400,
		description: 'Warm gradient frame.',
		accent: '#FF9B35'
	},
	{
		name: 'Lime Fade Wallpaper',
		kind: 'wallpaper',
		assetKey: 'static/cosmetics/wallpapers/lime-fade-wallpaper.svg',
		price: 8000,
		pointsPrice: 350,
		description: 'Subtle lime wash for your profile header.',
		accent: '#D5FF35'
	},
	{
		name: 'Midnight Grid',
		kind: 'wallpaper',
		assetKey: 'static/cosmetics/wallpapers/midnight-grid.svg',
		price: 12000,
		pointsPrice: 500,
		description: 'Dark grid pattern wallpaper.',
		accent: '#6B6F8A'
	},
	{
		name: 'OG Member',
		kind: 'badge',
		assetKey: 'static/cosmetics/badges/og-member.svg',
		price: 0,
		pointsPrice: 0,
		description: 'For the early ones. Free forever.',
		accent: '#D5FF35'
	},
	{
		name: 'Verified Vibes',
		kind: 'badge',
		assetKey: 'static/cosmetics/badges/verified-vibes.svg',
		price: 15000,
		pointsPrice: 500,
		description: 'A little checkmark with personality.',
		accent: '#35D6FF'
	},
	{
		name: 'Limited Neon Eclipse',
		kind: 'frame',
		assetKey: 'static/cosmetics/frames/limited-neon-eclipse.svg',
		price: 25000,
		pointsPrice: 900,
		stockLimit: 100,
		dropDays: 30,
		description: 'Limited run: only 100 frames, available for 30 days after first seed.',
		accent: '#B56DFF'
	}
];

try {
	for (const item of SEED) {
		await sql.begin(async (tx) => {
			const [product] = await tx`
				INSERT INTO products (name, description, price, currency, active, category)
				VALUES (${item.name}, ${item.description}, ${item.price}, 'IDR', true, 'cosmetic')
				ON CONFLICT (name) DO UPDATE
				SET description = ${item.description}, price = ${item.price}, active = true, category = 'cosmetic'
				RETURNING id
			`;

			const dropEndsAt = item.dropDays ? new Date(Date.now() + item.dropDays * 86400_000) : null;
			await tx`
				INSERT INTO cosmetics (id, kind, asset_key, accent_color, points_price, stock_limit, drop_ends_at)
				VALUES (
					${product.id}, ${item.kind},
					${item.assetKey},
					${item.accent}, ${item.pointsPrice ?? null}, ${item.stockLimit ?? null}, ${dropEndsAt}
				)
				ON CONFLICT (id) DO UPDATE
				SET kind = ${item.kind}, asset_key = EXCLUDED.asset_key, accent_color = ${item.accent},
					points_price = EXCLUDED.points_price,
					stock_limit = EXCLUDED.stock_limit,
					drop_ends_at = COALESCE(cosmetics.drop_ends_at, EXCLUDED.drop_ends_at),
					updated_at = now()
			`;
		});
	}

	await sql`
		INSERT INTO products (name, description, price, currency, active, category, duration_days)
		VALUES ('OVYN Premium Lifetime', 'One-time payment for lifetime profile customization.', 100000, 'IDR', true, 'plan', NULL)
		ON CONFLICT (name) DO UPDATE
		SET description = EXCLUDED.description, price = 100000,
			active = true, category = 'plan', duration_days = NULL
	`;

	const [{ count }] = await sql`SELECT count(*)::int AS count FROM cosmetics`;
	console.log(`Seed complete: ${count} cosmetics and the Premium lifetime plan.`);
	console.log('Starter SVG artwork is bundled under static/cosmetics; replace it later from /admin/catalog if desired.');
} catch (err) {
	console.error('Seed failed:', err instanceof Error ? err.message : err);
	process.exitCode = 1;
} finally {
	await sql.end();
}
