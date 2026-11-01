<script lang="ts">
	import { toasts, dismiss } from './toasts.svelte.ts';
</script>

<div class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
	{#each toasts as t (t.id)}
		<button
			type="button"
			onclick={() => dismiss(t.id)}
			class="pointer-events-auto w-full max-w-sm rounded-lg border px-4 py-3 text-left text-sm shadow-lg transition-colors
				{t.kind === 'success'
				? 'border-lime-300/40 bg-neutral-900 text-lime-200'
				: t.kind === 'error'
					? 'border-red-900/60 bg-neutral-900 text-red-300'
					: 'border-neutral-700 bg-neutral-900 text-neutral-200'}"
			aria-label="Dismiss notification"
		>
			{t.message}
		</button>
	{/each}
</div>
