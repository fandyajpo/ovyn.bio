import { z } from 'zod';
import { profileThemeSchema } from './profile';

export const TEMPLATE_BLOCK_TYPES = [
	'heading',
	'text',
	'blog',
	'quote',
	'image',
	'divider',
	'list',
	'code',
	'embed',
	'grid'
] as const;

export type TemplateBlockType = (typeof TEMPLATE_BLOCK_TYPES)[number];

export const TEMPLATE_LIST_STYLES = ['bullet', 'numbered', 'task'] as const;
export type TemplateListStyle = (typeof TEMPLATE_LIST_STYLES)[number];

export const TEMPLATE_LIST_STYLE_OPTIONS = [
	{ value: 'bullet', label: 'Bullet list' },
	{ value: 'numbered', label: 'Numbered list' },
	{ value: 'task', label: 'Task list' }
] as const;

export const TEMPLATE_EMBED_PROVIDERS = [
	'youtube',
	'vimeo',
	'spotify',
	'soundcloud',
	'figma',
	'codepen'
] as const;

export type TemplateEmbedProvider = (typeof TEMPLATE_EMBED_PROVIDERS)[number];

export const TEMPLATE_EMBED_PROVIDER_OPTIONS = [
	{ value: 'youtube', label: 'YouTube' },
	{ value: 'vimeo', label: 'Vimeo' },
	{ value: 'spotify', label: 'Spotify' },
	{ value: 'soundcloud', label: 'SoundCloud' },
	{ value: 'figma', label: 'Figma' },
	{ value: 'codepen', label: 'CodePen' }
] as const;

export type TemplateListItem = { id: string; text?: string; checked?: boolean };

export type TemplateGridCell = { id: string; heading?: string; markdown?: string };

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
	style?: TemplateListStyle;
	items?: TemplateListItem[];
	language?: string;
	code?: string;
	provider?: TemplateEmbedProvider;
	columns?: number;
	cells?: TemplateGridCell[];
};

export const TEMPLATE_BLOCK_LABELS: Record<TemplateBlockType, string> = {
	heading: 'Heading',
	text: 'Text',
	blog: 'Blog post',
	quote: 'Quote',
	image: 'Image',
	divider: 'Divider',
	list: 'List',
	code: 'Code',
	embed: 'Embed',
	grid: 'Grid'
};

export const TEMPLATE_BLOCK_HINTS: Record<TemplateBlockType, string> = {
	heading: 'A section title',
	text: 'Rich text with a full toolbar',
	blog: 'A titled post with a rich text body',
	quote: 'A line worth pulling out',
	image: 'An image with an optional caption',
	divider: 'A little space between sections',
	list: 'Bullet, numbered or task list',
	code: 'A code block with a language label',
	embed: 'YouTube, Spotify, Figma and more',
	grid: 'A responsive grid of content cards'
};

const optionalText = (max: number) => z.string().trim().max(max).optional();

const listItemSchema = z.object({
	id: z.string().trim().min(1).max(64),
	text: optionalText(300),
	checked: z.boolean().optional()
});

const gridCellSchema = z.object({
	id: z.string().trim().min(1).max(64),
	heading: optionalText(120),
	markdown: optionalText(4000)
});

export const templateBlockSchema = z.object({
	id: z.string().trim().min(1).max(64),
	type: z.enum(TEMPLATE_BLOCK_TYPES),
	text: optionalText(8000),
	markdown: optionalText(8000),
	title: optionalText(120),
	author: optionalText(80),
	url: optionalText(500),
	caption: optionalText(200),
	date: optionalText(28),
	style: z.enum(TEMPLATE_LIST_STYLES).optional(),
	items: z.array(listItemSchema).max(20).optional(),
	language: optionalText(24),
	code: z.string().max(8000).optional(),
	provider: z.enum(TEMPLATE_EMBED_PROVIDERS).optional(),
	columns: z.number().int().min(1).max(4).optional(),
	cells: z.array(gridCellSchema).max(12).optional()
});

export const templateBlocksSchema = z
	.array(templateBlockSchema)
	.max(40)
	.superRefine((blocks, context) => {
		blocks.forEach((block, index) => {
			if (block.type === 'image') {
				const url = block.url?.trim() ?? '';
				if (!url) {
					context.addIssue({ code: 'custom', path: [index, 'url'], message: 'Add an image link' });
					return;
				}
				if (!/^https:\/\//i.test(url) && !/^\/(?!\/)/.test(url)) {
					context.addIssue({ code: 'custom', path: [index, 'url'], message: 'Use an HTTPS image link' });
				}
			}

			if (block.type === 'embed') {
				const url = block.url?.trim() ?? '';
				if (!url || !/^https:\/\//i.test(url)) {
					context.addIssue({ code: 'custom', path: [index, 'url'], message: 'Use an HTTPS link to embed' });
				}
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
		case 'list':
			return !block.items?.some((item) => item.text?.trim());
		case 'code':
			return !block.code?.trim();
		case 'embed':
			return !block.url?.trim();
		case 'grid':
			return !block.cells?.some((cell) => cell.heading?.trim() || cell.markdown?.trim());
		default:
			return true;
	}
}

export function cleanTemplateBlocks(blocks: TemplateBlock[]): TemplateBlock[] {
	return blocks
		.filter((block) => !isTemplateBlockEmpty(block))
		.map((block) => {
			const next: TemplateBlock = {
				id: block.id,
				type: block.type,
				text: block.text?.trim(),
				markdown: block.markdown,
				title: block.title?.trim(),
				author: block.author?.trim(),
				url: block.url?.trim(),
				caption: block.caption?.trim(),
				date: block.date?.trim(),
				style: block.style,
				language: block.language?.trim(),
				code: block.code,
				provider: block.provider,
				columns: block.columns
			};

			if (block.items) {
				next.items = block.items
					.filter((item) => item.text?.trim())
					.map((item) => ({ id: item.id, text: (item.text ?? '').trim(), checked: item.checked }));
			}

			if (block.cells) {
				next.cells = block.cells
					.filter((cell) => cell.heading?.trim() || cell.markdown?.trim())
					.map((cell) => ({
						id: cell.id,
						heading: cell.heading?.trim(),
						markdown: cell.markdown
					}));
			}

			return next;
		});
}

const TEMPLATE_BLOCK_TYPE_SET = new Set<string>(TEMPLATE_BLOCK_TYPES);
const TEMPLATE_LIST_STYLE_SET = new Set<string>(TEMPLATE_LIST_STYLES);
const TEMPLATE_EMBED_PROVIDER_SET = new Set<string>(TEMPLATE_EMBED_PROVIDERS);

/** A body keeps its line breaks; only blank values are dropped. */
function readBlockBody(value: unknown, max: number): string | undefined {
	if (typeof value !== 'string' || !value.trim()) return undefined;
	return value.length > max ? value.slice(0, max) : value;
}

/** A single line field, trimmed. */
function readBlockField(value: unknown, max: number): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/** Hands out unique keys for one keyed list, keeping the stored id when it can. */
function idFactory(): (raw: unknown, fallback: string) => string {
	const used = new Set<string>();
	return (raw: unknown, fallback: string): string => {
		const base = typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, 64) : fallback;
		let id = base;
		let suffix = 2;
		while (used.has(id)) {
			id = `${base.slice(0, 56)}-${suffix}`;
			suffix += 1;
		}
		used.add(id);
		return id;
	};
}

/**
 * Blocks live in a jsonb column, so what comes back is whatever was saved:
 * older rows can miss ids, list styles or the fields the editor expects, and a
 * saved block can appear twice. Rendering keys blocks by id, so every block read
 * from storage passes through here to get a unique key and known fields.
 */
export function normalizeTemplateBlocks(value: unknown): TemplateBlock[] {
	if (!Array.isArray(value)) return [];

	const nextBlockId = idFactory();
	const blocks: TemplateBlock[] = [];

	value.forEach((raw, index) => {
		if (!raw || typeof raw !== 'object') return;
		const source = raw as Record<string, unknown>;
		if (typeof source.type !== 'string' || !TEMPLATE_BLOCK_TYPE_SET.has(source.type)) return;

		const type = source.type as TemplateBlockType;
		const block: TemplateBlock = { id: nextBlockId(source.id, `${type}-${index}`), type };

		block.text = readBlockBody(source.text, 8000);
		block.markdown = readBlockBody(source.markdown, 8000);
		block.title = readBlockField(source.title, 120);
		block.author = readBlockField(source.author, 80);
		block.url = readBlockField(source.url, 500);
		block.caption = readBlockField(source.caption, 200);
		block.date = readBlockField(source.date, 28);
		block.language = readBlockField(source.language, 24);
		block.code = readBlockBody(source.code, 8000);

		if (typeof source.style === 'string' && TEMPLATE_LIST_STYLE_SET.has(source.style)) {
			block.style = source.style as TemplateListStyle;
		}
		if (typeof source.provider === 'string' && TEMPLATE_EMBED_PROVIDER_SET.has(source.provider)) {
			block.provider = source.provider as TemplateEmbedProvider;
		}
		if (typeof source.columns === 'number' && Number.isFinite(source.columns)) {
			block.columns = Math.min(4, Math.max(1, Math.round(source.columns)));
		}

		if (Array.isArray(source.items)) {
			const nextItemId = idFactory();
			const items = source.items.flatMap((entry: unknown, itemIndex: number) => {
				if (!entry || typeof entry !== 'object') return [];
				const item = entry as Record<string, unknown>;
				return [
					{
						id: nextItemId(item.id, `item-${itemIndex}`),
						text: readBlockField(item.text, 300) ?? '',
						checked: item.checked === true
					}
				];
			});
			if (items.length) block.items = items;
		}

		if (Array.isArray(source.cells)) {
			const nextCellId = idFactory();
			const cells = source.cells.flatMap((entry: unknown, cellIndex: number) => {
				if (!entry || typeof entry !== 'object') return [];
				const cell = entry as Record<string, unknown>;
				return [
					{
						id: nextCellId(cell.id, `cell-${cellIndex}`),
						heading: readBlockField(cell.heading, 120),
						markdown: readBlockBody(cell.markdown, 4000)
					}
				];
			});
			if (cells.length) block.cells = cells;
		}

		blocks.push(block);
	});

	return blocks;
}

/**
 * Turn an embed provider plus a normal page URL into the URL an iframe can load.
 * Returns null when the URL does not belong to that provider, so the block can
 * fall back to a plain link.
 */
export function templateEmbedSrc(provider: TemplateEmbedProvider | undefined, rawUrl: string): string | null {
	if (!provider) return null;
	const url = rawUrl.trim();
	if (!/^https:\/\/[^\s]+$/i.test(url)) return null;

	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}
	if (parsed.protocol !== 'https:') return null;

	const host = parsed.hostname.replace(/^www\./, '');

	switch (provider) {
		case 'youtube': {
			if (host === 'youtu.be') {
				const id = parsed.pathname.slice(1).split('/')[0];
				return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
			}
			if (host !== 'youtube.com' && host !== 'm.youtube.com' && host !== 'youtube-nocookie.com') return null;
			const id =
				parsed.searchParams.get('v') ??
				(/\/(?:embed|shorts|live)\/([\w-]{6,})/.exec(parsed.pathname) ?? [])[1];
			return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
		}
		case 'vimeo': {
			if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;
			const id = (/(\d{5,})/.exec(parsed.pathname) ?? [])[1];
			return id ? `https://player.vimeo.com/video/${id}` : null;
		}
		case 'spotify': {
			if (host !== 'open.spotify.com') return null;
			const parts = parsed.pathname.split('/').filter(Boolean);
			const kind = parts[0];
			const id = parts[1];
			return kind && id ? `https://open.spotify.com/embed/${encodeURIComponent(kind)}/${encodeURIComponent(id)}` : null;
		}
		case 'soundcloud':
			if (host !== 'soundcloud.com' && host !== 'm.soundcloud.com') return null;
			return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23cdbcf3`;
		case 'figma':
			if (host !== 'figma.com') return null;
			return `https://www.figma.com/embed?embed_host=ovyn&url=${encodeURIComponent(url)}`;
		case 'codepen': {
			if (host !== 'codepen.io') return null;
			const segments = parsed.pathname.split('/').filter(Boolean);
			const user = segments[0];
			const pen = /\/pen\/([\w-]+)/.exec(parsed.pathname)?.[1];
			return user && pen ? `https://codepen.io/${encodeURIComponent(user)}/embed/${encodeURIComponent(pen)}?default-tab=result` : null;
		}
		default:
			return null;
	}
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
