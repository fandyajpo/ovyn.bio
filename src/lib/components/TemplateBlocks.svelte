<script lang="ts">
	import Markdown from './Markdown.svelte';
	import {
		normalizeTemplateBlocks,
		templateEmbedSrc,
		TEMPLATE_EMBED_PROVIDER_OPTIONS,
		type TemplateBlock
	} from '#lib/schemas/templates';

	let { blocks = [] }: { blocks?: TemplateBlock[] } = $props();

	// Stored blocks can come from an older row, so they are cleaned before
	// rendering: every block, list item and grid cell needs its own key.
	const safeBlocks = $derived(normalizeTemplateBlocks(blocks));

	function embedSrc(block: TemplateBlock): string | null {
		return templateEmbedSrc(block.provider, block.url ?? '');
	}

	function providerLabel(block: TemplateBlock): string {
		return TEMPLATE_EMBED_PROVIDER_OPTIONS.find((option) => option.value === block.provider)?.label ?? 'Embed';
	}

	function gridColumns(columns: number | undefined): number {
		if (!columns) return 2;
		return Math.min(4, Math.max(1, columns));
	}
</script>

<div class="page-blocks">
	{#each safeBlocks as block (block.id)}
		{#if block.type === 'heading'}
			<h2 class="page-block-heading">{block.text}</h2>
		{:else if block.type === 'text'}
			<div class="page-block-text">
				<Markdown content={block.markdown ?? ''} />
			</div>
		{:else if block.type === 'blog'}
			<article class="page-block-blog">
				<header class="page-block-blog-head">
					<h3>{block.title || 'Untitled post'}</h3>
					{#if block.date}<time>{block.date}</time>{/if}
				</header>
				<Markdown content={block.markdown ?? ''} />
			</article>
		{:else if block.type === 'quote'}
			<blockquote class="page-block-quote">
				<p>{block.text}</p>
				{#if block.author}<footer>by {block.author}</footer>{/if}
			</blockquote>
		{:else if block.type === 'image'}
			<figure class="page-block-image">
				<img src={block.url} alt={block.caption ?? ''} loading="lazy" />
				{#if block.caption}<figcaption>{block.caption}</figcaption>{/if}
			</figure>
		{:else if block.type === 'divider'}
			<hr class="page-block-divider" />
		{:else if block.type === 'list'}
			{#if block.style === 'numbered'}
				<ol class="page-block-list">
					{#each block.items ?? [] as item (item.id)}
						<li>{item.text}</li>
					{/each}
				</ol>
			{:else if block.style === 'task'}
				<ul class="page-block-list page-block-list--task">
					{#each block.items ?? [] as item (item.id)}
						<li class={item.checked ? 'is-checked' : ''}>
							<span class="task-box" aria-hidden="true">{item.checked ? '✓' : ''}</span>
							<span>{item.text}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<ul class="page-block-list">
					{#each block.items ?? [] as item (item.id)}
						<li>{item.text}</li>
					{/each}
				</ul>
			{/if}
		{:else if block.type === 'code'}
			<figure class="page-block-code">
				{#if block.language}<figcaption>{block.language}</figcaption>{/if}
				<pre><code>{block.code ?? ''}</code></pre>
			</figure>
		{:else if block.type === 'embed'}
			{@const src = embedSrc(block)}
			<figure class="page-block-embed">
				{#if src}
					<iframe
						{src}
						title={`${providerLabel(block)} embed`}
						loading="lazy"
						allow="accelerometer; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
						allowfullscreen
					></iframe>
				{:else}
					<a class="page-block-embed-link" href={block.url} target="_blank" rel="noopener noreferrer nofollow">
						<span class="embed-badge">{providerLabel(block)}</span>
						<span class="page-block-embed-url">{block.url}</span>
						<span aria-hidden="true">↗</span>
					</a>
				{/if}
				{#if block.caption}<figcaption>{block.caption}</figcaption>{/if}
			</figure>
		{:else if block.type === 'grid'}
			<div class="page-block-grid" style={`--grid-columns: ${gridColumns(block.columns)}`}>
				{#each block.cells ?? [] as cell (cell.id)}
					<div class="page-grid-cell">
						{#if cell.heading}<h3>{cell.heading}</h3>{/if}
						{#if cell.markdown}
							<div class="page-grid-cell-body"><Markdown content={cell.markdown} /></div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{/each}
</div>

<style>
	.page-blocks {
		display: flex;
		flex-direction: column;
		gap: clamp(1.5rem, 4vw, 2.75rem);
		margin-top: clamp(2.5rem, 7vw, 4.5rem);
	}

	.page-block-heading {
		font-size: clamp(1.35rem, 3.4vw, 1.9rem);
		font-weight: 600;
		letter-spacing: -0.035em;
		line-height: 1.25;
	}

	.page-block-text { max-width: 52rem; }

	.page-block-blog {
		width: 100%;
		max-width: 54rem;
		border: 1px solid var(--color-divider);
		border-radius: 1.35rem;
		background: color-mix(in srgb, var(--color-surface) 70%, transparent);
		padding: clamp(1.15rem, 3.5vw, 1.9rem);
		box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-foreground) 5%, transparent);
	}

	.page-block-blog-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem 1rem;
		margin-bottom: 0.85rem;
	}

	.page-block-blog-head h3 {
		font-size: clamp(1.1rem, 2.6vw, 1.4rem);
		font-weight: 600;
		letter-spacing: -0.025em;
	}

	.page-block-blog-head time {
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.08em;
	}

	.page-block-quote {
		max-width: 48rem;
		border-left: 2px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
		padding-left: clamp(1rem, 3vw, 1.6rem);
	}

	.page-block-quote p {
		font-size: clamp(1.1rem, 2.6vw, 1.5rem);
		font-style: italic;
		line-height: 1.6;
	}

	.page-block-quote footer {
		margin-top: 0.6rem;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.1em;
	}

	.page-block-image { max-width: 54rem; }

	.page-block-image img {
		width: 100%;
		border: 1px solid var(--color-divider);
		border-radius: 1.35rem;
		object-fit: cover;
	}

	.page-block-image figcaption {
		margin-top: 0.6rem;
		color: var(--color-muted);
		font-size: 0.78rem;
	}

	.page-block-divider {
		border: 0;
		border-top: 1px solid var(--color-divider);
	}

	.page-block-list {
		display: grid;
		gap: 0.45rem;
		max-width: 48rem;
		padding-left: 1.35rem;
		color: var(--color-foreground);
		font-size: 0.92rem;
		line-height: 1.7;
		list-style: disc;
	}

	ol.page-block-list { list-style: decimal; }
	.page-block-list li::marker { color: var(--color-accent); }

	.page-block-list--task {
		padding-left: 0;
		list-style: none;
	}

	.page-block-list--task li {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
	}

	.page-block-list--task li.is-checked > span:last-child {
		color: var(--color-muted);
		text-decoration: line-through;
	}

	.task-box {
		display: grid;
		width: 1.15rem;
		height: 1.15rem;
		flex: 0 0 auto;
		margin-top: 0.2rem;
		place-items: center;
		border: 1px solid color-mix(in srgb, var(--color-accent) 45%, transparent);
		border-radius: 0.35rem;
		color: var(--color-accent);
		font-size: 0.7rem;
		font-weight: 700;
	}

	.page-block-code {
		max-width: 54rem;
		overflow: hidden;
		border: 1px solid var(--color-divider);
		border-radius: 1.1rem;
		background: color-mix(in srgb, var(--color-background) 78%, transparent);
	}

	.page-block-code figcaption {
		border-bottom: 1px solid var(--color-divider);
		padding: 0.5rem 0.9rem;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.66rem;
		letter-spacing: 0.05em;
	}

	.page-block-code pre {
		margin: 0;
		overflow-x: auto;
		padding: 0.9rem 1rem;
		color: var(--color-foreground);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		line-height: 1.65;
	}

	.page-block-embed {
		max-width: 54rem;
		overflow: hidden;
		border: 1px solid var(--color-divider);
		border-radius: 1.35rem;
		background: color-mix(in srgb, var(--color-surface) 60%, transparent);
	}

	.page-block-embed iframe {
		display: block;
		width: 100%;
		border: 0;
		aspect-ratio: 16 / 9;
	}

	.page-block-embed-link {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		padding: 0.9rem 1rem;
		color: var(--color-foreground);
		font-size: 0.85rem;
		text-decoration: none;
	}

	.embed-badge {
		border-radius: 999px;
		background: var(--color-accent-soft);
		padding: 0.25rem 0.6rem;
		color: var(--color-accent);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.05em;
	}

	.page-block-embed-url {
		min-width: 0;
		flex: 1;
		overflow: hidden;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.page-block-embed figcaption {
		border-top: 1px solid var(--color-divider);
		padding: 0.55rem 1rem;
		color: var(--color-muted);
		font-size: 0.78rem;
	}

	.page-block-grid {
		display: grid;
		grid-template-columns: repeat(var(--grid-columns, 2), minmax(0, 1fr));
		gap: clamp(0.7rem, 2vw, 1.15rem);
		width: 100%;
	}

	.page-grid-cell {
		border: 1px solid var(--color-divider);
		border-radius: 1.1rem;
		background: color-mix(in srgb, var(--color-surface) 64%, transparent);
		padding: clamp(0.85rem, 2.4vw, 1.25rem);
	}

	.page-grid-cell h3 {
		font-size: clamp(1rem, 2.2vw, 1.2rem);
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.page-grid-cell-body {
		margin-top: 0.4rem;
		color: var(--color-muted);
		font-size: 0.84rem;
		line-height: 1.7;
	}

	@media (max-width: 46rem) {
		.page-block-grid { grid-template-columns: minmax(0, 1fr); }
	}
</style>
