import { and, asc, count, desc, eq, or } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { profileLinks, profileTemplates, profiles } from '#lib/server/db/schema';
import type { ProfileLinkInput, ProfileLinkProvider } from '#lib/schemas/profile-links';
import { PROFILE_LINK_PROVIDER_LABELS } from '#lib/schemas/profile-links';
import type { ProfileTemplateInput, ProfileTemplateUpdateInput } from '#lib/schemas/templates';
import { cleanTemplateBlocks } from '#lib/schemas/templates';
import { ConflictError, NotFoundError, ValidationError } from '#lib/server/utils/errors';

const CRYPTO_SCHEMES: Partial<Record<ProfileLinkProvider, string>> = {
	bitcoin: 'bitcoin',
	ethereum: 'ethereum',
	litecoin: 'litecoin',
	solana: 'solana',
	xrp: 'xrp',
	monero: 'monero'
};

function normalizeHttpsUrl(value: string): string {
	if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https:\/\//i.test(value)) {
		throw new ValidationError('Use an HTTPS link');
	}
	const candidate = /^https:\/\//i.test(value) ? value : `https://${value}`;
	try {
		const url = new URL(candidate);
		if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
			throw new Error('invalid URL');
		}
		return url.toString();
	} catch {
		throw new ValidationError('Enter a valid HTTPS link');
	}
}

function canonicalizeLink(provider: ProfileLinkProvider, rawValue: string): { label: string; url: string } {
	const value = rawValue.trim();
	if (!value) throw new ValidationError('Enter a link or address');

	if (provider === 'email') {
		const email = value.replace(/^mailto:/i, '');
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Enter a valid email address');
		return { label: email, url: `mailto:${email}` };
	}

	const cryptoScheme = CRYPTO_SCHEMES[provider];
	if (cryptoScheme && !/^https:\/\//i.test(value)) {
		const address = value.toLowerCase().startsWith(`${cryptoScheme}:`)
			? value.slice(cryptoScheme.length + 1)
			: value;
		if (!/^[a-zA-Z0-9]{15,120}$/.test(address)) {
			throw new ValidationError('Enter a valid wallet address or HTTPS explorer link');
		}
		return { label: PROFILE_LINK_PROVIDER_LABELS[provider], url: `${cryptoScheme}:${address}` };
	}

	return { label: PROFILE_LINK_PROVIDER_LABELS[provider], url: normalizeHttpsUrl(value) };
}

export type NewProfileLink = ProfileLinkInput;
export type NewProfileTemplate = ProfileTemplateInput;

export async function listProfileLinks(userId: string) {
	return db
		.select({
			id: profileLinks.id,
			provider: profileLinks.provider,
			label: profileLinks.label,
			url: profileLinks.url,
			sortOrder: profileLinks.sortOrder
		})
		.from(profileLinks)
		.where(eq(profileLinks.userId, userId))
		.orderBy(asc(profileLinks.sortOrder), asc(profileLinks.createdAt));
}

export async function addProfileLink(userId: string, input: NewProfileLink) {
	const [total] = await db
		.select({ total: count() })
		.from(profileLinks)
		.where(eq(profileLinks.userId, userId));
	if (Number(total?.total ?? 0) >= 40) throw new ConflictError('You can add up to 40 profile links');

	const canonical = canonicalizeLink(input.provider, input.url);
	const label = input.provider === 'custom_url' ? input.label?.trim() : input.label?.trim() || canonical.label;
	if (!label) throw new ValidationError('Add a label for your custom link');

	const [created] = await db
		.insert(profileLinks)
		.values({
			userId,
			provider: input.provider,
			label,
			url: canonical.url,
			sortOrder: Number(total?.total ?? 0)
		})
		.returning();
	return created;
}

export async function updateProfileLink(userId: string, input: ProfileLinkInput & { id: string }) {
	const canonical = canonicalizeLink(input.provider, input.url);
	const label = input.provider === 'custom_url' ? input.label?.trim() : input.label?.trim() || canonical.label;
	if (!label) throw new ValidationError('Add a label for your custom link');

	const [updated] = await db
		.update(profileLinks)
		.set({ provider: input.provider, label, url: canonical.url })
		.where(and(eq(profileLinks.id, input.id), eq(profileLinks.userId, userId)))
		.returning({ id: profileLinks.id });
	if (!updated) throw new NotFoundError('Link not found');
}

export async function deleteProfileLink(userId: string, linkId: string) {
	const [deleted] = await db
		.delete(profileLinks)
		.where(and(eq(profileLinks.id, linkId), eq(profileLinks.userId, userId)))
		.returning({ id: profileLinks.id });
	if (!deleted) throw new NotFoundError('Link not found');
}

export async function listProfileTemplates(userId: string) {
	const rows = await db
		.select({
			template: {
				id: profileTemplates.id,
				name: profileTemplates.name,
				description: profileTemplates.description,
				theme: profileTemplates.theme,
				blocks: profileTemplates.blocks,
				isPublic: profileTemplates.isPublic,
				createdAt: profileTemplates.createdAt
			},
			ownerId: profileTemplates.ownerUserId,
			ownerSlug: profiles.slug,
			ownerName: profiles.displayName
		})
		.from(profileTemplates)
		.leftJoin(
			profiles,
			and(eq(profiles.userId, profileTemplates.ownerUserId), eq(profiles.visibility, 'public'))
		)
		.where(or(eq(profileTemplates.isPublic, true), eq(profileTemplates.ownerUserId, userId)))
		.orderBy(desc(profileTemplates.isPublic), desc(profileTemplates.createdAt))
		.limit(100);

	return rows.map(({ ownerId, ...row }) => ({ ...row, isOwner: ownerId === userId }));
}

export async function createProfileTemplate(userId: string, input: NewProfileTemplate) {
	const [total] = await db
		.select({ total: count() })
		.from(profileTemplates)
		.where(eq(profileTemplates.ownerUserId, userId));
	if (Number(total?.total ?? 0) >= 20) throw new ConflictError('You can create up to 20 templates');

	const [created] = await db
		.insert(profileTemplates)
		.values({
			ownerUserId: userId,
			name: input.name,
			description: input.description,
			theme: input.theme,
			blocks: cleanTemplateBlocks(input.blocks ?? []),
			isPublic: input.isPublic
		})
		.returning();
	return created;
}

export async function getOwnedProfileTemplate(userId: string, templateId: string) {
	const [row] = await db
		.select()
		.from(profileTemplates)
		.where(and(eq(profileTemplates.id, templateId), eq(profileTemplates.ownerUserId, userId)))
		.limit(1);
	return row ?? null;
}

export async function updateProfileTemplate(userId: string, input: ProfileTemplateUpdateInput) {
	const [updated] = await db
		.update(profileTemplates)
		.set({
			name: input.name,
			description: input.description,
			theme: input.theme,
			blocks: cleanTemplateBlocks(input.blocks),
			isPublic: input.isPublic,
			updatedAt: new Date()
		})
		.where(and(eq(profileTemplates.id, input.id), eq(profileTemplates.ownerUserId, userId)))
		.returning({ id: profileTemplates.id });
	if (!updated) throw new NotFoundError('Template not found');
}

export async function setProfileTemplateVisibility(userId: string, templateId: string, isPublic: boolean) {
	const [updated] = await db
		.update(profileTemplates)
		.set({ isPublic, updatedAt: new Date() })
		.where(and(eq(profileTemplates.id, templateId), eq(profileTemplates.ownerUserId, userId)))
		.returning({ id: profileTemplates.id });
	if (!updated) throw new NotFoundError('Template not found');
}

export async function deleteProfileTemplate(userId: string, templateId: string) {
	const [deleted] = await db
		.delete(profileTemplates)
		.where(and(eq(profileTemplates.id, templateId), eq(profileTemplates.ownerUserId, userId)))
		.returning({ id: profileTemplates.id });
	if (!deleted) throw new NotFoundError('Template not found');
}

export async function applyProfileTemplate(userId: string, templateId: string) {
	const [template] = await db
		.select({ id: profileTemplates.id, theme: profileTemplates.theme, blocks: profileTemplates.blocks })
		.from(profileTemplates)
		.where(
			and(
				eq(profileTemplates.id, templateId),
				or(eq(profileTemplates.isPublic, true), eq(profileTemplates.ownerUserId, userId))
			)
		)
		.limit(1);
	if (!template) throw new NotFoundError('Template not found');

	const [profile] = await db
		.update(profiles)
		.set({ theme: template.theme, blocks: template.blocks, templateId: template.id, updatedAt: new Date() })
		.where(eq(profiles.userId, userId))
		.returning({ theme: profiles.theme });
	if (!profile) throw new NotFoundError('Profile not found');
	return profile.theme;
}

/** The template currently applied to a page, for the templates list. */
export async function getAppliedProfileTemplate(templateId: string) {
	const [row] = await db
		.select({ id: profileTemplates.id, name: profileTemplates.name, theme: profileTemplates.theme })
		.from(profileTemplates)
		.where(eq(profileTemplates.id, templateId))
		.limit(1);
	return row ?? null;
}
