<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils';

	let {
		variant = 'primary',
		type = 'button',
		href,
		disabled = false,
		loading = false,
		class: className,
		onclick,
		children,
		...rest
	}: {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		type?: 'button' | 'submit';
		href?: string;
		disabled?: boolean;
		loading?: boolean;
		class?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
		[key: string]: unknown;
	} = $props();

	const isDisabled = $derived(disabled || loading);
</script>

{#if href && !isDisabled}
	<a {href} {onclick} {rest} class={cn('ovyn-button', `ovyn-button--${variant}`, className)}>
		{@render children()}
	</a>
{:else}
	<button
		{type}
		{onclick}
		{rest}
		class={cn('ovyn-button', `ovyn-button--${variant}`, className)}
		disabled={isDisabled}
		aria-busy={loading}
	>
		{#if loading}
			<span class="ovyn-button-spinner" aria-hidden="true"></span>
		{/if}
		{@render children()}
	</button>
{/if}

<style>
	.ovyn-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border: 1px solid transparent;
		border-radius: 999px;
		padding: 0.62rem 1.15rem;
		color: var(--color-foreground);
		font-family: inherit;
		font-size: 0.82rem;
		font-weight: 600;
		line-height: 1;
		text-decoration: none;
		cursor: pointer;
		transition: transform 160ms ease, box-shadow 200ms ease, background-color 200ms ease, border-color 200ms ease, color 200ms ease;
	}

	.ovyn-button:disabled { cursor: not-allowed; opacity: 0.55; }
	.ovyn-button:active:not(:disabled) { transform: scale(0.97); }

	.ovyn-button--primary {
		border-color: color-mix(in srgb, var(--color-accent) 70%, transparent);
		background: linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-pop-lilac) 62%, var(--color-accent)));
		color: var(--color-on-accent);
		box-shadow:
			0 10px 26px color-mix(in srgb, var(--color-accent) 26%, transparent),
			inset 0 1px 0 rgb(255 255 255 / 28%);
	}

	.ovyn-button--secondary {
		border-color: var(--color-divider);
		background: linear-gradient(160deg, color-mix(in srgb, var(--color-surface) 92%, transparent), color-mix(in srgb, var(--color-background) 82%, transparent));
		color: var(--color-foreground);
		box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-foreground) 8%, transparent);
	}

	.ovyn-button--ghost {
		border-color: transparent;
		background: transparent;
		color: var(--color-muted);
	}

	.ovyn-button--danger {
		border-color: color-mix(in srgb, var(--color-danger) 32%, transparent);
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		color: var(--color-danger);
	}

	@media (hover: hover) and (pointer: fine) {
		.ovyn-button--primary:hover:not(:disabled) {
			box-shadow:
				0 14px 32px color-mix(in srgb, var(--color-accent) 34%, transparent),
				inset 0 1px 0 rgb(255 255 255 / 34%);
			transform: translateY(-1px);
		}

		.ovyn-button--secondary:hover:not(:disabled) {
			border-color: color-mix(in srgb, var(--color-accent) 34%, transparent);
			color: var(--color-foreground);
			transform: translateY(-1px);
		}

		.ovyn-button--ghost:hover:not(:disabled) {
			background: color-mix(in srgb, var(--color-accent) 9%, transparent);
			color: var(--color-foreground);
		}

		.ovyn-button--danger:hover:not(:disabled) {
			background: color-mix(in srgb, var(--color-danger) 18%, transparent);
			color: var(--color-danger-strong);
		}
	}

	.ovyn-button-spinner {
		display: inline-block;
		width: 0.9rem;
		height: 0.9rem;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: ovyn-button-spin 700ms linear infinite;
	}

	@keyframes ovyn-button-spin {
		to { transform: rotate(360deg); }
	}

	@media (prefers-reduced-motion: reduce) {
		.ovyn-button { transition: none; }
		.ovyn-button-spinner { animation: none; }
	}
</style>
