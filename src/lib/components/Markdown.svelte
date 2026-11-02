<script lang="ts">
	import { renderMarkdown } from '#lib/markdown';

	let { content, class: className = '' }: { content: string; class?: string } = $props();

	const html = $derived(renderMarkdown(content));
</script>

<div class="md {className}">{@html html}</div>

<style>
	.md {
		color: color-mix(in srgb, var(--color-foreground) 88%, var(--color-muted));
		font-size: 0.95rem;
		line-height: 1.75;
	}

	.md :global(p) { margin: 0 0 0.9rem; }
	.md :global(p:last-child) { margin-bottom: 0; }

	.md :global(h1),
	.md :global(h2),
	.md :global(h3),
	.md :global(h4) {
		margin: 1.4rem 0 0.6rem;
		color: var(--color-foreground);
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.3;
	}

	.md :global(h1:first-child),
	.md :global(h2:first-child),
	.md :global(h3:first-child),
	.md :global(h4:first-child) { margin-top: 0; }

	.md :global(h1) { font-size: 1.6rem; }
	.md :global(h2) { font-size: 1.35rem; }
	.md :global(h3) { font-size: 1.15rem; }
	.md :global(h4) { font-size: 1rem; }

	.md :global(strong) { color: var(--color-foreground); font-weight: 600; }
	.md :global(em) { font-style: italic; }

	.md :global(a) {
		color: var(--color-accent);
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-thickness: 1px;
	}

	.md :global(a:hover) { color: color-mix(in srgb, var(--color-accent) 80%, var(--color-foreground)); }

	.md :global(ul),
	.md :global(ol) {
		display: grid;
		gap: 0.35rem;
		margin: 0 0 0.9rem;
		padding-left: 1.25rem;
	}

	.md :global(li) { padding-left: 0.15rem; }
	.md :global(ul) { list-style: disc; }
	.md :global(ol) { list-style: decimal; }

	.md :global(blockquote) {
		margin: 1rem 0;
		border-left: 2px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
		padding: 0.15rem 0 0.15rem 1rem;
		color: var(--color-muted);
		font-style: italic;
	}

	.md :global(blockquote p) { margin: 0; }

	.md :global(code) {
		border: 1px solid var(--color-divider);
		border-radius: 0.4rem;
		background: color-mix(in srgb, var(--color-surface) 80%, transparent);
		padding: 0.1rem 0.35rem;
		color: var(--color-pop-pink);
		font-family: var(--font-mono);
		font-size: 0.82em;
	}

	.md :global(pre) {
		overflow-x: auto;
		border: 1px solid var(--color-divider);
		border-radius: 0.85rem;
		background: color-mix(in srgb, var(--color-surface) 86%, transparent);
		padding: 0.9rem 1rem;
		margin: 0 0 0.9rem;
	}

	.md :global(pre code) {
		border: 0;
		background: transparent;
		padding: 0;
		color: var(--color-foreground);
		font-size: 0.8rem;
	}

	.md :global(hr) {
		margin: 1.4rem 0;
		border: 0;
		border-top: 1px solid var(--color-divider);
	}
</style>
