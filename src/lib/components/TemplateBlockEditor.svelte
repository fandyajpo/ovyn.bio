<script lang="ts">
	import Markdown from './Markdown.svelte';
	import TemplateBlocks from './TemplateBlocks.svelte';
	import {
		TEMPLATE_BLOCK_HINTS,
		TEMPLATE_BLOCK_LABELS,
		TEMPLATE_BLOCK_TYPES,
		type TemplateBlock,
		type TemplateBlockType
	} from '#lib/schemas/templates';

	let { blocks = [], name = 'blocks' }: { blocks?: TemplateBlock[]; name?: string } = $props();

	let items = $state<TemplateBlock[]>(blocks.map((block) => ({ ...block })));
	let draggingIndex = $state<number | null>(null);
	let overIndex = $state<number | null>(null);
	let paletteType = $state<TemplateBlockType | null>(null);
	let activeIndex = $state<number | null>(null);
	let activeElement = $state<HTMLTextAreaElement | null>(null);

	const serialized = $derived(JSON.stringify(items));

	function createBlock(type: TemplateBlockType): TemplateBlock {
		const id = crypto.randomUUID().slice(0, 12);
		if (type === 'heading') return { id, type, text: 'A new section' };
		if (type === 'text') {
			return { id, type, markdown: 'Write something here. **Bold**, *italic*, `code` and [links](https://ovyn.bio) all work.' };
		}
		if (type === 'blog') {
			return {
				id,
				type,
				title: 'A new post',
				date: new Date().toISOString().slice(0, 10),
				markdown: 'Tell the story. Markdown works here too.'
			};
		}
		if (type === 'quote') return { id, type, text: 'A line worth keeping.' };
		if (type === 'image') return { id, type, url: '', caption: '' };
		return { id, type };
	}

	function addBlock(type: TemplateBlockType, index = items.length) {
		const next = [...items];
		next.splice(index, 0, createBlock(type));
		items = next;
	}

	function updateBlock(index: number, patch: Partial<TemplateBlock>) {
		const next = [...items];
		const current = next[index];
		if (!current) return;
		next[index] = { ...current, ...patch };
		items = next;
	}

	function removeBlock(index: number) {
		items = items.filter((_, position) => position !== index);
	}

	function duplicateBlock(index: number) {
		const current = items[index];
		if (!current) return;
		const next = [...items];
		next.splice(index + 1, 0, { ...current, id: crypto.randomUUID().slice(0, 12) });
		items = next;
	}

	function moveBlock(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= items.length) return;
		const next = [...items];
		const [moved] = next.splice(index, 1);
		if (!moved) return;
		next.splice(target, 0, moved);
		items = next;
	}

	function moveBlockTo(from: number, to: number) {
		if (from === to) return;
		const next = [...items];
		const [moved] = next.splice(from, 1);
		if (!moved) return;
		next.splice(from < to ? to - 1 : to, 0, moved);
		items = next;
	}

	function resetDrag() {
		draggingIndex = null;
		overIndex = null;
		paletteType = null;
	}

	function onDragStart(event: DragEvent, index: number) {
		draggingIndex = index;
		paletteType = null;
		event.dataTransfer?.setData('text/plain', `block:${index}`);
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
	}

	function onPaletteDragStart(event: DragEvent, type: TemplateBlockType) {
		paletteType = type;
		draggingIndex = null;
		event.dataTransfer?.setData('text/plain', `new:${type}`);
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
	}

	function onDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		overIndex = index;
	}

	function onDrop(event: DragEvent, index: number) {
		event.preventDefault();
		if (paletteType) addBlock(paletteType, index);
		else if (draggingIndex !== null) moveBlockTo(draggingIndex, index);
		resetDrag();
	}

	function onEditorFocus(index: number, event: FocusEvent) {
		activeIndex = index;
		activeElement = event.currentTarget as HTMLTextAreaElement;
	}

	function textValue(event: Event): string {
		return (event.currentTarget as HTMLInputElement | HTMLTextAreaElement).value;
	}

	function wrapSelection(before: string, after = before) {
		const element = activeElement;
		if (!element || activeIndex === null) return;
		const value = items[activeIndex]?.markdown ?? '';
		const start = element.selectionStart ?? value.length;
		const end = element.selectionEnd ?? start;
		const selected = value.slice(start, end) || 'text';
		const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
		updateBlock(activeIndex, { markdown: next });
		queueMicrotask(() => {
			element.focus();
			element.setSelectionRange(start + before.length, start + before.length + selected.length);
		});
	}

	function prefixSelection(prefix: string) {
		const element = activeElement;
		if (!element || activeIndex === null) return;
		const value = items[activeIndex]?.markdown ?? '';
		const start = element.selectionStart ?? 0;
		const end = element.selectionEnd ?? 0;
		const lineStart = value.lastIndexOf('\n', start - 1) + 1;
		const next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
		updateBlock(activeIndex, { markdown: next });
		queueMicrotask(() => {
			element.focus();
			element.setSelectionRange(start + prefix.length, end + prefix.length);
		});
	}

	function insertLink() {
		wrapSelection('[', '](https://)');
	}
</script>

<input type="hidden" {name} value={serialized} />

<div class="builder">
	<div class="builder-canvas">
		<div class="palette" aria-label="Add a content block">
			{#each TEMPLATE_BLOCK_TYPES as type (type)}
				<button
					type="button"
					class="palette-chip"
					draggable="true"
					ondragstart={(event) => onPaletteDragStart(event, type)}
					ondragend={resetDrag}
					onclick={() => addBlock(type)}
					title={TEMPLATE_BLOCK_HINTS[type]}
				>
					<span class="palette-plus" aria-hidden="true">+</span>
					<span>{TEMPLATE_BLOCK_LABELS[type]}</span>
				</button>
			{/each}
		</div>
		<p class="palette-hint">Drag a block into the page, or tap one to add it at the end.</p>

		{#if items.length === 0}
			<p class="builder-empty">Your layout is empty. Add a heading, some text or a blog post to start.</p>
		{/if}

		<div class="block-list">
			{#each items as block, index (block.id)}
				<article
					class="block-card {overIndex === index ? 'is-over' : ''}"
					draggable="true"
					ondragstart={(event) => onDragStart(event, index)}
					ondragover={(event) => onDragOver(event, index)}
					ondragleave={() => { if (overIndex === index) overIndex = null; }}
					ondrop={(event) => onDrop(event, index)}
					ondragend={resetDrag}
				>
					<header class="block-head">
						<span class="block-handle" aria-hidden="true">⠿</span>
						<span class="block-label">{TEMPLATE_BLOCK_LABELS[block.type]}</span>
						<div class="block-tools">
							<button type="button" onclick={() => moveBlock(index, -1)} disabled={index === 0} aria-label="Move block up">↑</button>
							<button type="button" onclick={() => moveBlock(index, 1)} disabled={index === items.length - 1} aria-label="Move block down">↓</button>
							<button type="button" onclick={() => duplicateBlock(index)}>Duplicate</button>
							<button type="button" class="block-remove" onclick={() => removeBlock(index)}>Remove</button>
						</div>
					</header>

					<div class="block-body">
						{#if block.type === 'heading'}
							<label class="builder-field">
								<span>Heading</span>
								<input
									class="builder-input"
									value={block.text ?? ''}
									maxlength={120}
									placeholder="A section title"
									oninput={(event) => updateBlock(index, { text: textValue(event) })}
								/>
							</label>
						{:else if block.type === 'text' || block.type === 'blog'}
			{#if block.type === 'blog'}
								<div class="field-row">
									<label class="block-field">
										<span>Post title</span>
										<input
											class="block-input"
											value={block.title ?? ''}
											maxlength={120}
											oninput={(event) => updateBlock(index, { title: textValue(event) })}
										/>
									</label>
									<label class="block-field field-date">
										<span>Date</span>
										<input type="date" class="block-input" value={block.date ?? ''} oninput={(event) => updateBlock(index, { date: textValue(event) })} />
									</label>
								</div>
							{/if}
							<div class="markdown-editor">
								<div class="markdown-toolbar">
									<button type="button" onclick={() => wrapSelection('**')} title="Bold">B</button>
									<button type="button" class="italic" onclick={() => wrapSelection('*')} title="Italic">I</button>
									<button type="button" onclick={insertLink} title="Link">Link</button>
									<button type="button" onclick={() => prefixSelection('## ')} title="Heading">H2</button>
									<button type="button" onclick={() => prefixSelection('- ')} title="Bullet list">List</button>
									<button type="button" onclick={() => prefixSelection('> ')} title="Quote">Quote</button>
								</div>
								<textarea
									class="editor-textarea"
									rows="6"
									value={block.markdown ?? ''}
									placeholder="Write with markdown: **bold**, *italic*, - lists, > quotes"
									onfocus={(event) => onEditorFocus(index, event)}
									oninput={(event) => updateBlock(index, { markdown: textValue(event) })}
								></textarea>
								<details class="markdown-preview">
									<summary>Preview this block</summary>
									<div class="preview-body">
										<Markdown content={block.markdown ?? ''} />
									</div>
								</details>
							</div>
						{:else if block.type === 'quote'}
							<label class="block-field">
								<span>Quote</span>
								<textarea class="block-input block-textarea" rows="3" value={block.text ?? ''} oninput={(event) => updateBlock(index, { text: textValue(event) })}></textarea>
							</label>
							<label class="block-field">
								<span>Attribution (optional)</span>
								<input class="block-input" value={block.author ?? ''} maxlength={80} oninput={(event) => updateBlock(index, { author: textValue(event) })} />
							</label>
						{:else if block.type === 'image'}
							<label class="block-field">
								<span>Image link</span>
								<input class="block-input" value={block.url ?? ''} placeholder="https://..." oninput={(event) => updateBlock(index, { url: textValue(event) })} />
							</label>
							<label class="block-field">
								<span>Caption (optional)</span>
								<input class="block-input" value={block.caption ?? ''} maxlength={200} oninput={(event) => updateBlock(index, { caption: textValue(event) })} />
							</label>
						{:else if block.type === 'divider'}
							<p class="block-note">A divider draws a soft line between sections.</p>
						{/if}
					</div>
				</article>
			{/each}
		</div>

		<div
			class="drop-end {overIndex === items.length ? 'is-over' : ''}"
			ondragover={(event) => onDragOver(event, items.length)}
			ondragleave={() => { if (overIndex === items.length) overIndex = null; }}
			ondrop={(event) => onDrop(event, items.length)}
		>
			Drop here to add at the end
		</div>
	</div>

	<aside class="builder-preview" aria-label="Live preview">
		<div class="preview-head">
			<span>Live preview</span>
			<span class="preview-count">{items.length} block{items.length === 1 ? '' : 's'}</span>
		</div>
		<div class="preview-stage">
			<TemplateBlocks blocks={items} />
		</div>
	</aside>
</div>

<style>
	.builder {
		display: grid;
		gap: 1.25rem;
	}

	.builder-canvas { min-width: 0; }
	.palette { display: flex; flex-wrap: wrap; gap: 0.45rem; }

	.palette-chip {
		display: inline-flex;
		min-height: 2.4rem;
		align-items: center;
		gap: 0.4rem;
		border: 1px dashed color-mix(in srgb, var(--color-foreground) 22%, transparent);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 70%, transparent);
		padding: 0.4rem 0.8rem;
		color: var(--color-foreground);
		font: inherit;
		font-size: 0.76rem;
		font-weight: 600;
		cursor: grab;
		transition: border-color 160ms ease, background-color 160ms ease, transform 160ms ease;
	}

	.palette-chip:hover {
		border-color: color-mix(in srgb, var(--color-accent) 52%, transparent);
		background: var(--color-accent-soft);
		transform: translateY(-1px);
	}

	.palette-chip:active { cursor: grabbing; transform: scale(0.98); }
	.palette-plus { color: var(--color-accent); font-size: 0.9rem; }

	.palette-hint {
		margin-top: 0.55rem;
		color: var(--color-muted);
		font-size: 0.7rem;
	}

	.builder-empty {
		margin-top: 1rem;
		border: 1px dashed var(--color-divider);
		border-radius: 1rem;
		padding: 1.5rem 1rem;
		color: var(--color-muted);
		font-size: 0.82rem;
		text-align: center;
	}

	.block-list { display: grid; gap: 0.75rem; margin-top: 1.25rem; }

	.block-card {
		border: 1px solid var(--color-divider);
		border-radius: 1.15rem;
		background: color-mix(in srgb, var(--color-surface) 74%, transparent);
		transition: border-color 160ms ease, box-shadow 180ms ease, transform 200ms ease;
	}

	.block-card.is-over {
		border-color: color-mix(in srgb, var(--color-accent) 70%, transparent);
		box-shadow: 0 0 0 4px var(--color-accent-soft);
	}

	.block-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		border-bottom: 1px solid var(--color-divider);
		padding: 0.6rem 0.8rem;
	}

	.block-handle { color: var(--color-muted); cursor: grab; letter-spacing: 0.1em; }
	.block-label { color: var(--color-foreground); font-size: 0.75rem; font-weight: 600; letter-spacing: 0.02em; }
	.block-tools { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-left: auto; }

	.block-tools button {
		min-height: 1.9rem;
		border: 1px solid var(--color-divider);
		border-radius: 0.55rem;
		background: transparent;
		padding: 0.2rem 0.55rem;
		color: var(--color-muted);
		font: inherit;
		font-size: 0.68rem;
		cursor: pointer;
		transition: color 140ms ease, border-color 140ms ease, background-color 140ms ease;
	}

	.block-tools button:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--color-accent) 42%, transparent);
		background: var(--color-accent-soft);
		color: var(--color-foreground);
	}

	.block-tools button:disabled { opacity: 0.35; cursor: not-allowed; }
	.block-remove:hover { border-color: color-mix(in srgb, #f87171 50%, transparent); color: #f87171; }

	.block-body {
		display: grid;
		gap: 0.7rem;
		padding: 0.85rem;
	}

	.block-field,
	.builder-field { display: grid; gap: 0.3rem; }
	.block-field > span,
	.builder-field > span { color: var(--color-muted); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }

	.block-input,
	.builder-input {
		width: 100%;
		border: 1px solid var(--color-divider);
		border-radius: 0.7rem;
		background: color-mix(in srgb, var(--color-background) 70%, transparent);
		padding: 0.55rem 0.7rem;
		color: var(--color-foreground);
		font: inherit;
		font-size: 0.84rem;
		transition: border-color 160ms ease, box-shadow 160ms ease;
	}

	.block-input:focus,
	.builder-input:focus {
		border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
		outline: none;
		box-shadow: 0 0 0 3px var(--color-accent-soft);
	}

	.block-textarea { resize: vertical; line-height: 1.6; }
	.field-row { display: grid; gap: 0.7rem; }

	.markdown-editor {
		overflow: hidden;
		border: 1px solid var(--color-divider);
		border-radius: 0.85rem;
		background: color-mix(in srgb, var(--color-background) 66%, transparent);
	}

	.markdown-toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.2rem;
		border-bottom: 1px solid var(--color-divider);
		padding: 0.35rem;
	}

	.markdown-toolbar button {
		min-height: 1.85rem;
		border: 0;
		border-radius: 0.45rem;
		background: transparent;
		padding: 0.2rem 0.55rem;
		color: var(--color-muted);
		font: inherit;
		font-size: 0.7rem;
		font-weight: 600;
		cursor: pointer;
	}

	.markdown-toolbar button:hover { background: var(--color-accent-soft); color: var(--color-foreground); }
	.markdown-toolbar .italic { font-style: italic; }

	.editor-textarea {
		width: 100%;
		min-height: 8rem;
		resize: vertical;
		border: 0;
		background: transparent;
		padding: 0.75rem 0.8rem;
		color: var(--color-foreground);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		line-height: 1.65;
	}

	.editor-textarea:focus { outline: none; }

	.markdown-preview { border-top: 1px solid var(--color-divider); }

	.markdown-preview summary {
		cursor: pointer;
		padding: 0.45rem 0.8rem;
		color: var(--color-muted);
		font-size: 0.7rem;
		list-style: none;
	}

	.markdown-preview summary::-webkit-details-marker { display: none; }
	.markdown-preview[open] summary { color: var(--color-accent); }
	.preview-body { padding: 0.2rem 0.85rem 0.85rem; }

	.block-note { color: var(--color-muted); font-size: 0.78rem; }

	.drop-end {
		display: grid;
		min-height: 3.2rem;
		place-items: center;
		margin-top: 0.75rem;
		border: 1px dashed var(--color-divider);
		border-radius: 1rem;
		color: var(--color-muted);
		font-size: 0.72rem;
		transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
	}

	.drop-end.is-over {
		border-color: color-mix(in srgb, var(--color-accent) 62%, transparent);
		background: var(--color-accent-soft);
		color: var(--color-accent);
	}

	.builder-preview {
		min-width: 0;
		border: 1px solid var(--color-divider);
		border-radius: 1.25rem;
		background:
			radial-gradient(ellipse at 100% 0%, color-mix(in srgb, var(--color-pop-lilac) 8%, transparent), transparent 60%),
			color-mix(in srgb, var(--color-surface) 55%, transparent);
		padding: 1rem;
	}

	.preview-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border-bottom: 1px solid var(--color-divider);
		padding-bottom: 0.6rem;
		color: var(--color-foreground);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.preview-count {
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.08em;
	}

	.preview-stage { padding-top: 1rem; }
	.preview-stage :global(.page-blocks) { margin-top: 0; gap: 1.25rem; }

	@media (min-width: 64rem) {
		.builder { grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 1.75rem; align-items: start; }
		.builder-preview { position: sticky; top: 1.5rem; max-height: calc(100dvh - 3rem); overflow-y: auto; }
		.field-row { grid-template-columns: minmax(0, 1fr) 11rem; }
	}

	@media (prefers-reduced-motion: reduce) {
		.palette-chip,
		.block-card,
		.block-tools button,
		.drop-end { transition: none; }
	}
</style>
