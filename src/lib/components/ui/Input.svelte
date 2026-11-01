<script lang="ts">
	import { cn } from '$lib/utils';

	let {
		name,
		label,
		type = 'text',
		value = $bindable(''),
		placeholder,
		required = false,
		minlength,
		maxlength,
		textarea = false,
		error = null,
		class: className
	}: {
		name: string;
		label: string;
		type?: string;
		value?: string;
		placeholder?: string;
		required?: boolean;
		minlength?: number;
		maxlength?: number;
		textarea?: boolean;
		error?: string | null;
		class?: string;
	} = $props();

	const field =
		'w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition-colors focus:border-lime-300 focus:ring-1 focus:ring-lime-300/40';
</script>

<label class={cn('block', className)}>
	<span class="mb-1.5 block text-sm font-medium text-neutral-300">
		{label}
		{#if required}<span class="text-lime-300">*</span>{/if}
	</span>

	{#if textarea}
		<textarea {name} bind:value {placeholder} {required} {minlength} {maxlength} rows="4" class={field}></textarea>
	{:else}
		<input {type} {name} bind:value {placeholder} {required} {minlength} {maxlength} class={field} />
	{/if}

	{#if error}
		<span class="mt-1 block text-xs text-red-400">{error}</span>
	{/if}
</label>
