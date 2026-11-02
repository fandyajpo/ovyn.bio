<script lang="ts">
	import { toasts, dismiss } from './toasts.svelte.ts';
</script>

<div class="toast-stack pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
	{#each toasts as t (t.id)}
		<button
			type="button"
			onclick={() => dismiss(t.id)}
			class="toast pointer-events-auto w-full max-w-sm"
			data-kind={t.kind}
			aria-label="Dismiss notification"
		>
			{t.message}
		</button>
	{/each}
</div>

<style>
	.toast {
		--toast-accent: var(--color-accent);
		--toast-text: var(--color-foreground);
		border: 1px solid color-mix(in srgb, var(--toast-accent) 36%, transparent);
		border-radius: 1rem;
		background:
			linear-gradient(150deg, color-mix(in srgb, var(--toast-accent) 10%, var(--color-menu-glass)), var(--color-menu-glass));
		padding: 0.8rem 1rem;
		color: var(--toast-text);
		font: inherit;
		font-size: 0.85rem;
		text-align: left;
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--color-foreground) 8%, transparent),
			0 18px 40px rgb(0 0 0 / 22%);
	}

	.toast[data-kind='success'] { --toast-accent: var(--color-accent); }

	.toast[data-kind='error'] {
		--toast-accent: var(--color-danger);
		--toast-text: var(--color-danger);
	}

	.toast[data-kind='info'] { --toast-accent: var(--color-pop-blue); }

	@media (prefers-reduced-motion: reduce) {
		.toast { transition: none; }
	}
</style>
