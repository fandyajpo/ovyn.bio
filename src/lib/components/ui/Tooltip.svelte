<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		content,
		label = 'More information',
		placement = 'top',
		children = null
	}: {
		content: string;
		label?: string;
		placement?: 'top' | 'bottom' | 'left' | 'right';
		children?: Snippet | null;
	} = $props();

	const id = $props.id();
</script>

<span class="ovyn-tooltip" data-placement={placement}>
	<button type="button" class="ovyn-tooltip-trigger {children ? 'ovyn-tooltip-trigger--custom' : ''}" aria-label={label} aria-describedby={id}>
		{#if children}
			{@render children()}
		{:else}
			<span aria-hidden="true">?</span>
		{/if}
	</button>
	<span id={id} class="ovyn-tooltip-bubble" role="tooltip">{content}</span>
</span>

<style>
	.ovyn-tooltip {
		position: relative;
		display: inline-flex;
		vertical-align: middle;
	}

	.ovyn-tooltip-trigger {
		display: grid;
		width: 1.5rem;
		height: 1.5rem;
		place-items: center;
		border: 1px solid color-mix(in srgb, var(--color-pop-blue) 34%, transparent);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-pop-blue) 12%, var(--color-surface));
		color: var(--color-pop-blue);
		font-family: var(--font-mono);
		font-size: 0.68rem;
		font-weight: 700;
		cursor: help;
		transition: transform 160ms ease, background-color 160ms ease, border-color 160ms ease;
	}

	.ovyn-tooltip-trigger:hover {
		border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
		background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
		transform: translateY(-1px);
	}

	.ovyn-tooltip-trigger--custom {
		width: auto;
		height: auto;
		border: 0;
		background: transparent;
		color: inherit;
	}

	.ovyn-tooltip-bubble {
		position: absolute;
		z-index: var(--layer-tooltip);
		width: max-content;
		max-width: min(17rem, 80vw);
		border: 1px solid var(--color-divider);
		border-radius: 0.9rem;
		background:
			linear-gradient(150deg, color-mix(in srgb, var(--color-accent) 8%, var(--color-menu-glass)), var(--color-menu-glass));
		padding: 0.6rem 0.8rem;
		color: var(--color-foreground);
		font-family: var(--font-sans);
		font-size: 0.74rem;
		font-weight: 400;
		line-height: 1.5;
		text-align: left;
		box-shadow: 0 16px 38px rgb(0 0 0 / 32%);
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transition: opacity 140ms ease, transform 160ms ease, visibility 0s linear 160ms;
	}

	.ovyn-tooltip[data-placement='top'] .ovyn-tooltip-bubble {
		bottom: calc(100% + 0.55rem);
		left: 50%;
		transform: translate(-50%, 0.3rem);
	}

	.ovyn-tooltip[data-placement='bottom'] .ovyn-tooltip-bubble {
		top: calc(100% + 0.55rem);
		left: 50%;
		transform: translate(-50%, -0.3rem);
	}

	.ovyn-tooltip[data-placement='left'] .ovyn-tooltip-bubble {
		top: 50%;
		right: calc(100% + 0.55rem);
		transform: translate(0.3rem, -50%);
	}

	.ovyn-tooltip[data-placement='right'] .ovyn-tooltip-bubble {
		top: 50%;
		left: calc(100% + 0.55rem);
		transform: translate(-0.3rem, -50%);
	}

	.ovyn-tooltip:hover .ovyn-tooltip-bubble,
	.ovyn-tooltip:focus-within .ovyn-tooltip-bubble {
		opacity: 1;
		visibility: visible;
		transition-delay: 0s;
	}

	.ovyn-tooltip[data-placement='top']:hover .ovyn-tooltip-bubble,
	.ovyn-tooltip[data-placement='top']:focus-within .ovyn-tooltip-bubble,
	.ovyn-tooltip[data-placement='bottom']:hover .ovyn-tooltip-bubble,
	.ovyn-tooltip[data-placement='bottom']:focus-within .ovyn-tooltip-bubble {
		transform: translate(-50%, 0);
	}

	.ovyn-tooltip[data-placement='left']:hover .ovyn-tooltip-bubble,
	.ovyn-tooltip[data-placement='left']:focus-within .ovyn-tooltip-bubble,
	.ovyn-tooltip[data-placement='right']:hover .ovyn-tooltip-bubble,
	.ovyn-tooltip[data-placement='right']:focus-within .ovyn-tooltip-bubble {
		transform: translate(0, -50%);
	}

	/* On a phone the bubble becomes a small card resting above the bottom
	   edge, so it never spills off the side of the screen. */
	@media (max-width: 40rem) {
		.ovyn-tooltip[data-placement] .ovyn-tooltip-bubble {
			position: fixed;
			top: auto;
			right: 0.6rem;
			bottom: calc(0.6rem + env(safe-area-inset-bottom));
			left: 0.6rem;
			width: auto;
			max-width: none;
			border-radius: 1.1rem;
			padding: 0.8rem 0.95rem;
			font-size: 0.78rem;
			transform: translateY(0.7rem);
		}

		.ovyn-tooltip[data-placement]:hover .ovyn-tooltip-bubble,
		.ovyn-tooltip[data-placement]:focus-within .ovyn-tooltip-bubble {
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ovyn-tooltip-bubble,
		.ovyn-tooltip-trigger { transition: none; }
	}
</style>
