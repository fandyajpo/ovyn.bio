<script lang="ts">
	import Markdown from './Markdown.svelte';
	import type { TemplateBlock } from '#lib/schemas/templates';

	let { blocks = [] }: { blocks?: TemplateBlock[] } = $props();
</script>

<div class="page-blocks">
	{#each blocks as block (block.id)}
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
</style>
