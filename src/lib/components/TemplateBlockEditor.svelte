<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { DragDropProvider } from '@dnd-kit/svelte';
	import { isSortable } from '@dnd-kit/svelte/sortable';
	import RichTextEditor from './RichTextEditor.svelte';
	import TemplateBlocks from './TemplateBlocks.svelte';
	import BlockDropEnd from './BlockDropEnd.svelte';
	import PaletteBlockChip from './PaletteBlockChip.svelte';
	import SortableBlockCard from './SortableBlockCard.svelte';
	import { createPreviewPublisher, previewKeyFor, type PreviewPublisher } from '#lib/template-preview';
	import {
		TEMPLATE_BLOCK_TYPES,
		TEMPLATE_EMBED_PROVIDER_OPTIONS,
		TEMPLATE_LIST_STYLE_OPTIONS,
		normalizeTemplateBlocks,
		type TemplateBlock,
		type TemplateBlockType
	} from '#lib/schemas/templates';

	let {
		blocks = [],
		name = 'blocks',
		previewKey = null
	}: { blocks?: TemplateBlock[]; name?: string; previewKey?: string | null } = $props();

	// A stored row can miss ids or hold the same block twice, which breaks a
	// keyed list, so the editor starts from a clean, fully keyed copy.
	let items = $state<TemplateBlock[]>(untrack(() => normalizeTemplateBlocks(blocks)));
	// The order to fall back to when a drag is cancelled.
	let snapshot = $state<TemplateBlock[]>([]);
	let draggingSort = $state(false);

	let previewSession = $state('');
	let publisher = $state.raw<PreviewPublisher | null>(null);

	const serialized = $derived(JSON.stringify(items));
	const activePreviewKey = $derived(
		previewKey && previewSession ? previewKeyFor(previewKey, previewSession) : null
	);

	function newId(): string {
		return crypto.randomUUID().slice(0, 12);
	}

	function createBlock(type: TemplateBlockType): TemplateBlock {
		const id = newId();
		if (type === 'heading') return { id, type, text: 'A new section' };
		if (type === 'text') {
			return { id, type, markdown: 'Write something here. **Bold**, *italic*, `code` and [links](https://ovyn.me) all work.' };
		}
		if (type === 'blog') {
			return {
				id,
				type,
				title: 'A new post',
				date: new Date().toISOString().slice(0, 10),
				markdown: 'Tell the story.'
			};
		}
		if (type === 'quote') return { id, type, text: 'A line worth keeping.' };
		if (type === 'image') return { id, type, url: '', caption: '' };
		if (type === 'list') {
			return {
				id,
				type,
				style: 'bullet',
				items: [
					{ id: newId(), text: 'First item' },
					{ id: newId(), text: 'Second item' }
				]
			};
		}
		if (type === 'code') return { id, type, language: 'javascript', code: 'console.log("hello from ovyn");' };
		if (type === 'embed') return { id, type, provider: 'youtube', url: '', caption: '' };
		if (type === 'grid') {
			return {
				id,
				type,
				columns: 2,
				cells: [
					{ id: newId(), heading: 'Card one', markdown: 'A short line about this card.' },
					{ id: newId(), heading: 'Card two', markdown: 'Another short line.' }
				]
			};
		}
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
		next.splice(index + 1, 0, { ...current, id: newId() });
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

	function addListItem(index: number) {
		const block = items[index];
		if (!block) return;
		updateBlock(index, { items: [...(block.items ?? []), { id: newId(), text: '' }] });
	}

	function updateListItem(index: number, itemIndex: number, patch: { text?: string; checked?: boolean }) {
		const block = items[index];
		if (!block) return;
		const list = [...(block.items ?? [])];
		const item = list[itemIndex];
		if (!item) return;
		list[itemIndex] = { ...item, ...patch };
		updateBlock(index, { items: list });
	}

	function removeListItem(index: number, itemIndex: number) {
		const block = items[index];
		if (!block) return;
		updateBlock(index, { items: (block.items ?? []).filter((_, position) => position !== itemIndex) });
	}

	function addGridCell(index: number) {
		const block = items[index];
		if (!block) return;
		const cells = block.cells ?? [];
		if (cells.length >= 12) return;
		updateBlock(index, { cells: [...cells, { id: newId(), heading: '', markdown: '' }] });
	}

	function updateGridCell(index: number, cellIndex: number, patch: { heading?: string; markdown?: string }) {
		const block = items[index];
		if (!block) return;
		const cells = [...(block.cells ?? [])];
		const cell = cells[cellIndex];
		if (!cell) return;
		cells[cellIndex] = { ...cell, ...patch };
		updateBlock(index, { cells });
	}

	function removeGridCell(index: number, cellIndex: number) {
		const block = items[index];
		if (!block) return;
		updateBlock(index, { cells: (block.cells ?? []).filter((_, position) => position !== cellIndex) });
	}

	// dnd-kit owns both drag sources: reordering a block that already exists and
	// dragging a block type out of the palette into the page.
	function beginDrag(sortable: boolean) {
		draggingSort = sortable;
		if (sortable) snapshot = items.slice();
	}

	function dragOver(from: number, to: number) {
		if (from === to) return;
		const next = [...items];
		const [moved] = next.splice(from, 1);
		if (!moved) return;
		next.splice(to, 0, moved);
		items = next;
	}

	function textValue(event: Event): string {
		return (event.currentTarget as HTMLInputElement | HTMLTextAreaElement).value;
	}

	function publishState(instance: PreviewPublisher, immediate = false) {
		// The editor's blocks are Svelte state, and a proxy cannot be structured
		// cloned, so the preview always gets a plain snapshot of them.
		instance.publish($state.snapshot(items), immediate);
	}

	onMount(() => {
		previewSession = crypto.randomUUID().slice(0, 8);
		if (!previewKey) return;
		const instance = createPreviewPublisher(previewKeyFor(previewKey, previewSession));
		publisher = instance;
		publishState(instance, true);
		return () => {
			instance.dispose();
			publisher = null;
		};
	});

	$effect(() => {
		void serialized;
		const instance = publisher;
		if (!instance) return;
		publishState(instance);
	});
</script>

<input type="hidden" {name} value={serialized} />

<div class="builder">
	<div class="builder-canvas">
		<DragDropProvider
			onDragStart={(event) => beginDrag(Boolean(event.operation.source && isSortable(event.operation.source)))}
			onDragOver={(event) => {
				const { source, target } = event.operation;
				if (isSortable(source) && isSortable(target)) dragOver(source.index, target.index);
			}}
			onDragEnd={(event) => {
				const { source, target } = event.operation;
				if (event.canceled) {
					if (draggingSort) items = snapshot;
				} else if (source && !isSortable(source) && target) {
					const type = source.data.type as TemplateBlockType;
					if (TEMPLATE_BLOCK_TYPES.includes(type)) {
						addBlock(type, isSortable(target) ? target.index : items.length);
					}
				}

				draggingSort = false;
			}}
		>
			<div class="palette" aria-label="Add a content block">
				{#each TEMPLATE_BLOCK_TYPES as type (type)}
					<PaletteBlockChip {type} onadd={() => addBlock(type)} />
				{/each}
			</div>
			<p class="palette-hint">Drag a block into the page, or tap one to add it at the end.</p>

			{#if items.length === 0}
				<p class="builder-empty">Your layout is empty. Add a heading, some text or a grid to start.</p>
			{/if}

			<div class="block-list">
				{#each items as block, index (block.id)}
					<SortableBlockCard
						{block}
						{index}
						total={items.length}
						onmove={(direction) => moveBlock(index, direction)}
						onduplicate={() => duplicateBlock(index)}
						onremove={() => removeBlock(index)}
					>
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
						{:else if block.type === 'text'}
							<RichTextEditor
								value={block.markdown ?? ''}
								label="Text block"
								onChange={(markdown) => updateBlock(index, { markdown })}
							/>
						{:else if block.type === 'blog'}
							<div class="field-row">
								<label class="block-field">
									<span>Post title</span>
									<input
										class="block-input"
										value={block.title ?? ''}
										maxlength={120}
										placeholder="A new post"
										oninput={(event) => updateBlock(index, { title: textValue(event) })}
									/>
								</label>
								<label class="block-field field-date">
									<span>Date</span>
									<input type="date" class="block-input" value={block.date ?? ''} oninput={(event) => updateBlock(index, { date: textValue(event) })} />
								</label>
							</div>
							<RichTextEditor
								value={block.markdown ?? ''}
								label="Post body"
								onChange={(markdown) => updateBlock(index, { markdown })}
							/>
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
						{:else if block.type === 'list'}
							<div class="chip-row" role="group" aria-label="List style">
								{#each TEMPLATE_LIST_STYLE_OPTIONS as option (option.value)}
									<button type="button" class:is-active={block.style === option.value} onclick={() => updateBlock(index, { style: option.value })}>{option.label}</button>
								{/each}
							</div>
							<div class="item-list">
								{#each block.items ?? [] as item, itemIndex (item.id)}
									<div class="item-row">
										{#if block.style === 'task'}
											<input
												type="checkbox"
												checked={Boolean(item.checked)}
												aria-label={`Done: ${item.text || 'item'}`}
												onchange={(event) => updateListItem(index, itemIndex, { checked: (event.currentTarget as HTMLInputElement).checked })}
											/>
										{/if}
										<input
											class="block-input"
											value={item.text}
											maxlength={300}
											placeholder="List item"
											oninput={(event) => updateListItem(index, itemIndex, { text: textValue(event) })}
										/>
										<button type="button" class="row-remove" onclick={() => removeListItem(index, itemIndex)} aria-label="Remove item">×</button>
									</div>
								{/each}
							</div>
							<button type="button" class="add-row" onclick={() => addListItem(index)}>+ Add item</button>
						{:else if block.type === 'code'}
							<label class="block-field">
								<span>Language</span>
								<input class="block-input" value={block.language ?? ''} maxlength={24} placeholder="javascript" oninput={(event) => updateBlock(index, { language: textValue(event) })} />
							</label>
							<label class="block-field">
								<span>Code</span>
								<textarea class="block-input block-code" rows="7" value={block.code ?? ''} spellcheck="false" oninput={(event) => updateBlock(index, { code: textValue(event) })}></textarea>
							</label>
						{:else if block.type === 'embed'}
							<div class="chip-row" role="group" aria-label="Embed provider">
								{#each TEMPLATE_EMBED_PROVIDER_OPTIONS as option (option.value)}
									<button type="button" class:is-active={block.provider === option.value} onclick={() => updateBlock(index, { provider: option.value })}>{option.label}</button>
								{/each}
							</div>
							<label class="block-field">
								<span>Link to embed</span>
								<input class="block-input" value={block.url ?? ''} placeholder="https://..." oninput={(event) => updateBlock(index, { url: textValue(event) })} />
							</label>
							<label class="block-field">
								<span>Caption (optional)</span>
								<input class="block-input" value={block.caption ?? ''} maxlength={200} oninput={(event) => updateBlock(index, { caption: textValue(event) })} />
							</label>
						{:else if block.type === 'grid'}
							<div class="chip-row" role="group" aria-label="Grid columns">
								{#each [1, 2, 3, 4] as count (count)}
									<button type="button" class:is-active={(block.columns ?? 2) === count} onclick={() => updateBlock(index, { columns: count })}>{count} col{count === 1 ? '' : 's'}</button>
								{/each}
							</div>
							<p class="block-note">Columns stack on small screens. Add a cell for each row of content.</p>
							<div class="cell-list">
								{#each block.cells ?? [] as cell, cellIndex (cell.id)}
									<div class="cell-card">
										<div class="cell-head">
											<span>Cell {cellIndex + 1}</span>
											<button type="button" class="row-remove" onclick={() => removeGridCell(index, cellIndex)} aria-label="Remove cell">×</button>
										</div>
										<input
											class="block-input"
											value={cell.heading ?? ''}
											maxlength={120}
											placeholder="Cell heading (optional)"
											oninput={(event) => updateGridCell(index, cellIndex, { heading: textValue(event) })}
										/>
										<RichTextEditor
											value={cell.markdown ?? ''}
											label={`Grid cell ${cellIndex + 1}`}
											minHeight="5rem"
											onChange={(markdown) => updateGridCell(index, cellIndex, { markdown })}
										/>
									</div>
								{/each}
							</div>
							<button type="button" class="add-row" onclick={() => addGridCell(index)}>+ Add cell</button>
						{/if}
					</SortableBlockCard>
				{/each}
			</div>

			<BlockDropEnd index={items.length} />
		</DragDropProvider>
	</div>

	<aside class="builder-preview elevated-scroll" aria-label="Live preview">
		<div class="preview-head">
			<span>Live preview</span>
			<span class="preview-actions">
				{#if activePreviewKey}
					<a class="preview-open" href={`/templates/preview?key=${encodeURIComponent(activePreviewKey)}`} target="_blank" rel="noopener">Open tab ↗</a>
				{/if}
				<span class="preview-count">{items.length} block{items.length === 1 ? '' : 's'}</span>
			</span>
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

	.block-field,
	.builder-field { display: grid; gap: 0.3rem; }
	.block-field > span,
	.builder-field > span { color: var(--color-muted); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.03em; }

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
	}

	.block-input:focus,
	.builder-input:focus {
		border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
		outline: none;
		box-shadow: 0 0 0 3px var(--color-accent-soft);
	}

	.block-textarea { resize: vertical; line-height: 1.6; }
	.block-code { font-family: var(--font-mono); font-size: 0.8rem; line-height: 1.6; resize: vertical; }
	.field-row { display: grid; gap: 0.7rem; }

	.chip-row { display: flex; flex-wrap: wrap; gap: 0.35rem; }

	.chip-row button {
		min-height: 2rem;
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: transparent;
		padding: 0.25rem 0.7rem;
		color: var(--color-muted);
		font: inherit;
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
		transition: color 140ms ease, border-color 140ms ease, background-color 140ms ease;
	}

	.chip-row button:hover { border-color: color-mix(in srgb, var(--color-accent) 40%, transparent); color: var(--color-foreground); }
	.chip-row button.is-active { border-color: color-mix(in srgb, var(--color-accent) 55%, transparent); background: var(--color-accent-soft); color: var(--color-accent); }

	.item-list { display: grid; gap: 0.4rem; }

	.item-row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.item-row input[type='checkbox'] { flex: 0 0 auto; }

	.row-remove {
		display: grid;
		width: 2rem;
		height: 2rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 0.55rem;
		background: transparent;
		color: var(--color-muted);
		font-size: 0.95rem;
		cursor: pointer;
		transition: color 140ms ease, border-color 140ms ease;
	}

	.row-remove:hover { border-color: color-mix(in srgb, var(--color-danger) 50%, transparent); color: var(--color-danger); }

	.add-row {
		width: fit-content;
		border: 1px dashed var(--color-divider);
		border-radius: 0.6rem;
		background: transparent;
		padding: 0.35rem 0.7rem;
		color: var(--color-muted);
		font: inherit;
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
		transition: color 140ms ease, border-color 140ms ease;
	}

	.add-row:hover { border-color: color-mix(in srgb, var(--color-accent) 45%, transparent); color: var(--color-accent); }

	.cell-list { display: grid; gap: 0.6rem; }

	.cell-card {
		display: grid;
		gap: 0.5rem;
		border: 1px solid var(--color-divider);
		border-radius: 0.85rem;
		padding: 0.6rem;
	}

	.cell-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		color: var(--color-muted);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.03em;
	}

	.block-note { color: var(--color-muted); font-size: 0.78rem; }

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

	.preview-actions { display: flex; align-items: center; gap: 0.6rem; }

	.preview-open {
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		padding: 0.2rem 0.6rem;
		color: var(--color-accent);
		font-size: 0.66rem;
		font-weight: 600;
		text-decoration: none;
		transition: border-color 140ms ease, background-color 140ms ease;
	}

	.preview-open:hover { border-color: color-mix(in srgb, var(--color-accent) 45%, transparent); background: var(--color-accent-soft); }

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
		.chip-row button,
		.add-row,
		.row-remove,
		.preview-open { transition: none; }
	}
</style>
