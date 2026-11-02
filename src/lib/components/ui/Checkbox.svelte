<script lang="ts">
	import { cn } from '#lib/utils';

	let {
		name,
		label,
		value = 'on',
		checked = $bindable(false),
		disabled = false,
		required = false,
		hint = null,
		error = null,
		class: className
	}: {
		name: string;
		label: string;
		value?: string;
		checked?: boolean;
		disabled?: boolean;
		required?: boolean;
		hint?: string | null;
		error?: string | null;
		class?: string;
	} = $props();

	const id = $props.id();
	const describedBy = $derived(
		[hint ? `${id}-hint` : null, error ? `${id}-error` : null]
			.filter(Boolean)
			.join(' ') || undefined
	);
</script>

<div class={cn('flex flex-col gap-1', className)}>
	<label for={id} class="flex min-h-11 items-center gap-3 text-sm text-neutral-300">
		<input
			type="checkbox"
			{id}
			{name}
			{value}
			bind:checked
			{disabled}
			{required}
			aria-invalid={Boolean(error)}
			aria-describedby={describedBy}
			class="size-4 shrink-0 accent-lime-300 focus-visible:outline-2 focus-visible:outline-offset-2"
		/>
		<span>{label}{#if required}<span class="ml-1 text-lime-300" aria-hidden="true">*</span>{/if}</span>
	</label>
	{#if hint}<p id="{id}-hint" class="text-xs text-neutral-500">{hint}</p>{/if}
	{#if error}<p id="{id}-error" class="text-xs text-red-400" role="alert">{error}</p>{/if}
</div>
