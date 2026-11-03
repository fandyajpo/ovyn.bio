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
	<div class="ovyn-overlay" transition:fade={{ duration: 170 }}>
		<button type="button" class="ovyn-overlay-backdrop" onclick={close} aria-label="Close dialog"></button>
		<dialog
			open
			class="ovyn-modal {className}"
			aria-modal="true"
			aria-labelledby="{id}-title"
			aria-describedby={description ? `${id}-description` : undefined}
			transition:fly={{ y: 18, duration: 220 }}
		>
			<span class="ovyn-modal-grip" aria-hidden="true"></span>
			<header class="ovyn-modal-head">
				<div>
					<p class="ovyn-modal-eyebrow">ovyn</p>
					<h2 id="{id}-title">{title}</h2>
					{#if description}<p id="{id}-description" class="ovyn-modal-description">{description}</p>{/if}
				</div>
				<button type="button" class="ovyn-modal-close" onclick={close} aria-label="Close dialog">×</button>
			</header>
			<div class="ovyn-modal-body">{@render children()}</div>
		</dialog>
	</div>
{/if}

<style>
	.ovyn-overlay {
		position: fixed;
		z-index: var(--layer-modal);
		inset: 0;
		display: grid;
		place-items: center;
		padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
	}

	.ovyn-overlay-backdrop {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
		background:
			radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 60%),
			rgb(10 9 14 / 62%);
		backdrop-filter: blur(16px);
	}

	.ovyn-modal {
		position: relative;
		z-index: 1;
		width: min(100%, 34rem);
		max-height: min(90dvh, 52rem);
		margin: 0;
		overflow: auto;
		overscroll-behavior: contain;
		border: 1px solid var(--color-divider);
		border-radius: 1.5rem;
		background:
			radial-gradient(ellipse at 100% 0%, color-mix(in srgb, var(--color-pop-lilac) 9%, transparent), transparent 60%),
			linear-gradient(160deg, color-mix(in srgb, var(--color-surface) 97%, transparent), color-mix(in srgb, var(--color-background) 92%, transparent));
		padding: clamp(1.15rem, 4vw, 1.75rem);
		color: var(--color-foreground);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--color-foreground) 8%, transparent),
			0 34px 100px rgb(0 0 0 / 30%);
	}

	.ovyn-modal::before {
		position: absolute;
		top: 0;
		right: 18%;
		left: 18%;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
		content: '';
		opacity: 0.55;
	}

	.ovyn-modal-grip { display: none; }

	.ovyn-modal-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.ovyn-modal-eyebrow {
		margin: 0 0 0.35rem;
		color: var(--color-accent);
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
	}

	.ovyn-modal-head h2 {
		font-size: 1.22rem;
		font-weight: 600;
		letter-spacing: -0.025em;
		line-height: 1.25;
	}

	.ovyn-modal-description {
		margin-top: 0.4rem;
		color: var(--color-muted);
		font-size: 0.8rem;
		line-height: 1.6;
	}

	.ovyn-modal-close {
		display: grid;
		width: 2.35rem;
		height: 2.35rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 50%;
		background: color-mix(in srgb, var(--color-surface) 80%, transparent);
		color: var(--color-muted);
		font-size: 1.3rem;
		line-height: 1;
		transition: background-color 170ms ease, color 170ms ease, transform 240ms ease, border-color 170ms ease;
	}

	.ovyn-modal-close:hover {
		border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
		background: var(--color-accent-soft);
		color: var(--color-foreground);
		transform: rotate(90deg);
	}

	.ovyn-modal-body {
		margin-top: 1.25rem;
		color: var(--color-foreground);
		font-size: 0.88rem;
		line-height: 1.65;
	}

	@media (max-width: 40rem) {
		.ovyn-overlay { place-items: end center; padding: 0; }

		.ovyn-modal {
			width: 100%;
			max-height: 90dvh;
			border-radius: 1.5rem 1.5rem 0 0;
			padding: 0.6rem 1.1rem calc(1.4rem + env(safe-area-inset-bottom));
			border-bottom: 0;
		}

		.ovyn-modal-grip {
			display: block;
			width: 2.6rem;
			height: 0.28rem;
			margin: 0.35rem auto 1rem;
			border-radius: 999px;
			background: color-mix(in srgb, var(--color-foreground) 22%, transparent);
		}
	}

	@media (max-height: 32rem) {
		.ovyn-overlay { place-items: stretch; padding: 0; }

		.ovyn-modal {
			width: 100%;
			max-height: 100dvh;
			border-radius: 0;
			border-inline: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ovyn-overlay,
		.ovyn-modal { transition: none !important; }
	}
</style>
