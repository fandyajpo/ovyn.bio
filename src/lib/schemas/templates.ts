import { z } from 'zod';
import { profileThemeSchema } from './profile';

export const TEMPLATE_BLOCK_TYPES = ['heading', 'text', 'blog', 'quote', 'image', 'divider'] as const;

export type TemplateBlockType = (typeof TEMPLATE_BLOCK_TYPES)[number];

export type TemplateBlock = {
	id: string;
	type: TemplateBlockType;
	text?: string;
	markdown?: string;
	title?: string;
	author?: string;
	url?: string;
	caption?: string;
	date?: string;
};

export const TEMPLATE_BLOCK_LABELS: Record<TemplateBlockType, string> = {
	heading: 'Heading',
	text: 'Text',
	blog: 'Blog post',
	quote: 'Quote',
	image: 'Image',
	divider: 'Divider'
};

export const TEMPLATE_BLOCK_HINTS: Record<TemplateBlockType, string> = {
	heading: 'A section title',
	text: 'Markdown text',
	blog: 'A titled post with a markdown body',
	quote: 'A line worth pulling out',
	image: 'An image with an optional caption',
	divider: 'A little space between sections'
};

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const templateBlockSchema = z.object({
	id: z.string().trim().min(1).max(64),
	type: z.enum(TEMPLATE_BLOCK_TYPES),
	text: optionalText(2000),
	markdown: optionalText(8000),
	title: optionalText(120),
	author: optionalText(80),
	url: optionalText(500),
	caption: optionalText(200),
	date: optionalText(28)
});

export const templateBlocksSchema = z
	.array(templateBlockSchema)
	.max(40)
	.superRefine((blocks, context) => {
		blocks.forEach((block, index) => {
			if (block.type !== 'image') return;
			const url = block.url?.trim() ?? '';
			if (!url) {
				context.addIssue({ code: 'custom', path: [index, 'url'], message: 'Add an image link' });
				return;
			}
			if (!/^https:\/\//i.test(url) && !/^\/(?!\/)/.test(url)) {
				context.addIssue({ code: 'custom', path: [index, 'url'], message: 'Use an HTTPS image link' });
			}
		});
	});

/** A blank block renders nothing, so there is no reason to store it. */
export function isTemplateBlockEmpty(block: TemplateBlock): boolean {
	switch (block.type) {
		case 'heading':
			return !block.text?.trim();
		case 'text':
			return !block.markdown?.trim();
		case 'blog':
			return !block.title?.trim() && !block.markdown?.trim();
		case 'quote':
			return !block.text?.trim();
		case 'image':
			return !block.url?.trim();
		case 'divider':
			return false;
		default:
			return true;
	}
}

export function cleanTemplateBlocks(blocks: TemplateBlock[]): TemplateBlock[] {
	return blocks
		.filter((block) => !isTemplateBlockEmpty(block))
		.map((block) => ({
			id: block.id,
			type: block.type,
			text: block.text?.trim(),
			markdown: block.markdown,
			title: block.title?.trim(),
			author: block.author?.trim(),
			url: block.url?.trim(),
			caption: block.caption?.trim(),
			date: block.date?.trim()
		}));
}

function parseJsonValue(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

export const createProfileTemplateSchema = z.object({
	name: z.string().trim().min(2, 'Template name must have at least 2 characters').max(40),
	description: z.string().trim().max(160).transform((value) => value || null),
	theme: profileThemeSchema,
	isPublic: z.preprocess((value) => value === 'on' || value === true, z.boolean()),
	blocks: z.preprocess(parseJsonValue, templateBlocksSchema).optional()
});

export const updateProfileTemplateSchema = z.object({
	id: z.uuid(),
	name: z.string().trim().min(2, 'Template name must have at least 2 characters').max(40),
	description: z.string().trim().max(160).transform((value) => value || null),
	theme: profileThemeSchema,
	isPublic: z.preprocess((value) => value === 'on' || value === true, z.boolean()),
	blocks: z.preprocess(parseJsonValue, templateBlocksSchema)
});

export const updateProfileTemplateVisibilitySchema = z.object({
	id: z.uuid(),
	isPublic: z.preprocess((value) => value === 'on' || value === true, z.boolean())
});

export type ProfileTemplateInput = z.infer<typeof createProfileTemplateSchema>;
export type ProfileTemplateUpdateInput = z.infer<typeof updateProfileTemplateSchema>;

export const profileTemplateIdSchema = z.object({ id: z.uuid() });
