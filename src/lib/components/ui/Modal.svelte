<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let {
		open = $bindable(false),
		title,
		description = null,
		children,
		class: className = ''
	}: {
		open?: boolean;
		title: string;
		description?: string | null;
		children: Snippet;
		class?: string;
	} = $props();

	const id = $props.id();

	function close() {
		open = false;
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			event.preventDefault();
			close();
		}
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#if open}
	<div class="modal-layer" transition:fade={{ duration: 160 }}>
		<button type="button" class="modal-backdrop" onclick={close} aria-label="Close dialog"></button>
		<dialog
			open
			class="modal-panel {className}"
			aria-modal="true"
			aria-labelledby="{id}-title"
			aria-describedby={description ? `${id}-description` : undefined}
			transition:fly={{ y: 10, duration: 180 }}
		>
			<header class="modal-heading">
				<div>
					<h2 id="{id}-title">{title}</h2>
					{#if description}<p id="{id}-description">{description}</p>{/if}
				</div>
				<button type="button" class="modal-close" onclick={close} aria-label="Close dialog">×</button>
			</header>
			<div class="modal-content">{@render children()}</div>
		</dialog>
	</div>
{/if}

<style>
	.modal-layer {
		position: fixed;
		z-index: 100;
		inset: 0;
		display: grid;
		place-items: center;
		padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
	}

	.modal-backdrop {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
		background: rgb(12 11 17 / 55%);
		backdrop-filter: blur(14px);
	}

	.modal-panel {
		position: relative;
		z-index: 1;
		margin: 0;
		color: var(--color-foreground);
		width: min(100%, 36rem);
		max-height: min(90dvh, 52rem);
		overflow: auto;
		border: 1px solid var(--color-divider);
		border-radius: 1.5rem;
		background: color-mix(in srgb, var(--color-surface) 94%, transparent);
		padding: clamp(1.15rem, 4vw, 1.75rem);
		box-shadow: 0 28px 90px rgb(0 0 0 / 24%);
	}

	.modal-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
	.modal-heading h2 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.03em; }
	.modal-heading p { margin-top: 0.35rem; color: var(--color-muted); font-size: 0.85rem; line-height: 1.55; }
	.modal-close { display: grid; width: 2.5rem; height: 2.5rem; flex: 0 0 auto; place-items: center; border: 0; border-radius: 50%; background: transparent; color: var(--color-muted); font-size: 1.5rem; transition: background-color 160ms ease, color 160ms ease, transform 160ms ease; }
	.modal-close:hover { transform: rotate(90deg); background: var(--color-accent-soft); color: var(--color-foreground); }
	.modal-content { margin-top: 1.25rem; }

	@media (prefers-reduced-motion: reduce) {
		.modal-layer,
		.modal-panel { transition: none !important; }
	}
</style>
