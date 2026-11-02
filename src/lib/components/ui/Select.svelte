<script lang="ts">
	import { cn } from '#lib/utils';

	type Option = { value: string; label: string; disabled?: boolean };

	let {
		name,
		label,
		options,
		value = $bindable(''),
		placeholder = 'Choose an option',
		required = false,
		disabled = false,
		hint = null,
		error = null,
		class: className,
		...rest
	}: {
		name: string;
		label: string;
		options: Option[];
		value?: string;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		hint?: string | null;
		error?: string | null;
		class?: string;
		[key: string]: unknown;
	} = $props();

	const id = $props.id();
	const describedBy = $derived(
		[hint ? `${id}-hint` : null, error ? `${id}-error` : null]
			.filter(Boolean)
			.join(' ') || undefined
	);
</script>

<div class={cn('flex flex-col gap-1.5', className)}>
	<label for={id} class="text-sm font-medium text-neutral-300">
		{label}{#if required}<span class="ml-1 text-lime-300" aria-hidden="true">*</span>{/if}
	</label>
	<div class="relative">
		<select
			{...rest}
			{id}
			{name}
			bind:value
			{required}
			{disabled}
			aria-invalid={Boolean(error)}
			aria-describedby={describedBy}
			class="min-h-11 w-full appearance-none rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 pr-10 text-sm text-neutral-100 outline-none transition-colors focus:border-lime-300 focus:ring-1 focus:ring-lime-300/40 disabled:cursor-not-allowed disabled:opacity-60"
		>
			<option value="" disabled={required}>{placeholder}</option>
			{#each options as option (option.value)}
				<option value={option.value} disabled={option.disabled}>{option.label}</option>
			{/each}
		</select>
		<span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-neutral-500" aria-hidden="true">⌄</span>
	</div>
	{#if hint}<p id="{id}-hint" class="text-xs text-neutral-500">{hint}</p>{/if}
	{#if error}<p id="{id}-error" class="text-xs text-red-400" role="alert">{error}</p>{/if}
</div>
