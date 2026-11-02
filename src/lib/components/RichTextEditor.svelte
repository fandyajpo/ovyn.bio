<script lang="ts">
	import { onMount } from 'svelte';
	import type { Component } from 'svelte';

	type EditorProps = {
		value: string;
		label: string;
		minHeight: string;
		onChange: (markdown: string) => void;
	};

	let {
		value = '',
		label = 'Rich text',
		minHeight = '8rem',
		onChange
	}: { value?: string; label?: string; minHeight?: string; onChange: (markdown: string) => void } = $props();

	// The rich editor is loaded in the browser only. If it cannot load (missing
	// package, old browser), the plain markdown field below keeps working.
	let Tiptap = $state.raw<Component<EditorProps> | null>(null);

	onMount(() => {
		let disposed = false;
		void import('./RichTextEditorTiptap.svelte')
			.then((module) => {
				if (!disposed) Tiptap = module.default;
			})
			.catch((err) => {
				console.error('Rich text editor unavailable, using markdown', err);
			});
		return () => {
			disposed = true;
		};
	});

	function onPlainInput(event: Event): void {
		onChange((event.currentTarget as HTMLTextAreaElement).value);
	}
</script>

{#if Tiptap}
	<Tiptap {value} {label} {minHeight} {onChange} />
{:else}
	<div class="plain-editor">
		<textarea
			class="plain-field"
			rows="8"
			{value}
			placeholder="Write with markdown: **bold**, *italic*, - lists, > quotes"
			aria-label={label}
			oninput={onPlainInput}
		></textarea>
	</div>
{/if}

<style>
	.plain-editor {
		overflow: hidden;
		border: 1px solid var(--color-divider);
		border-radius: 0.85rem;
		background: color-mix(in srgb, var(--color-background) 66%, transparent);
	}

	.plain-field {
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

	.plain-field:focus { outline: none; }
</style>
