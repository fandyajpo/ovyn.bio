import { z } from 'zod';

const nullableText = (maxLength: number) =>
	z.preprocess(
		(value) => (value === undefined || value === null || (typeof value === 'string' && !value.trim()) ? null : typeof value === 'string' ? value.trim() : value),
		z.string().max(maxLength).nullable()
	);

const nullableInteger = (minimum: number, maximum: number) =>
	z.preprocess(
		(value) => {
			if (value === '' || value === undefined || value === null) return null;
			return typeof value === 'string' ? Number(value) : value;
		},
		z.number().int().min(minimum).max(maximum).nullable()
	);

const requiredInteger = z.preprocess(
	(value) => {
		if (typeof value === 'string' && value.trim() === '') return undefined;
		return typeof value === 'string' ? Number(value) : value;
	},
	z.number().int().min(0).max(1_000_000_000)
);

const cosmeticKind = z.preprocess(
	(value) => (value === '' || value === undefined ? null : value),
	z.enum(['frame', 'wallpaper', 'badge']).nullable()
);

const accentColor = z.preprocess(
	(value) => (value === undefined || value === null || (typeof value === 'string' && !value.trim()) ? null : typeof value === 'string' ? value.trim() : value),
	z.string().regex(/^#[0-9a-f]{6}$/i, 'Use a 6-digit hex color').nullable()
);

const dropEndsAt = z.preprocess(
	(value) => {
		if (typeof value !== 'string' || !value.trim()) return null;
		return new Date(`${value}T23:59:59.999Z`);
	},
	z.date().nullable()
);

const active = z.preprocess((value) => value === 'on' || value === true, z.boolean());

const productFields = {
	name: z.string().trim().min(2, 'Name must have at least 2 characters').max(100),
	description: nullableText(1000),
	price: requiredInteger,
	active,
	durationDays: nullableInteger(1, 365),
	kind: cosmeticKind,
	assetKey: nullableText(512),
	accentColor,
	pointsPrice: nullableInteger(0, 1_000_000),
	stockLimit: nullableInteger(1, 1_000_000),
	dropEndsAt
};

export const adminCreateProductSchema = z
	.object({
		...productFields,
		category: z.enum(['cosmetic', 'profile_spotlight', 'guild_spotlight'])
	})
	.superRefine((product, context) => {
		if (product.category === 'cosmetic') {
			if (!product.kind) {
				context.addIssue({ code: 'custom', path: ['kind'], message: 'Choose a cosmetic type' });
			}
			if (!product.assetKey?.startsWith('cosmetics/') && !product.assetKey?.startsWith('static/cosmetics/')) {
				context.addIssue({ code: 'custom', path: ['assetKey'], message: 'Upload an image for this cosmetic' });
			}
			if (product.price === 0 && product.pointsPrice === null) {
				context.addIssue({ code: 'custom', path: ['pointsPrice'], message: 'A free cosmetic needs a points price (use 0 for free)' });
			}
		} else {
			if (!product.durationDays) {
				context.addIssue({ code: 'custom', path: ['durationDays'], message: 'Spotlights need a duration from 1 to 365 days' });
			}
			if (product.price < 1) {
				context.addIssue({ code: 'custom', path: ['price'], message: 'Spotlight products must have a positive price' });
			}
		}
	});

export const adminUpdateProductSchema = z.object({
	...productFields,
	id: z.uuid()
});

export type AdminCreateProduct = z.infer<typeof adminCreateProductSchema>;
export type AdminUpdateProduct = z.infer<typeof adminUpdateProductSchema>;
