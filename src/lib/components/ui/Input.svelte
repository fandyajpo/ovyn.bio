<script lang="ts">
	import { cn } from '#lib/utils';

	let {
		name,
		label,
		type = 'text',
		value = $bindable(''),
		checked = $bindable(false),
		groupValue = $bindable(''),
		files = $bindable<FileList | null>(null),
		placeholder,
		required = false,
		minlength,
		maxlength,
		min,
		max,
		step,
		pattern,
		accept,
		multiple = false,
		autocomplete,
		inputmode,
		disabled = false,
		readonly = false,
		textarea = false,
		hint = null,
		error = null,
		class: className,
		...rest
	}: {
		name: string;
		label: string;
		type?: string;
		value?: string;
		checked?: boolean;
		groupValue?: string;
		files?: FileList | null;
		placeholder?: string;
		required?: boolean;
		minlength?: number;
		maxlength?: number;
		min?: number | string;
		max?: number | string;
		step?: number | string;
		pattern?: string;
		accept?: string;
		multiple?: boolean;
		autocomplete?: string;
		inputmode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
		disabled?: boolean;
		readonly?: boolean;
		textarea?: boolean;
		hint?: string | null;
		error?: string | null;
		class?: string;
		[key: string]: unknown;
	} = $props();

	const id = $props.id();
	const describedBy = $derived(
		[hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
	);

	const field =
		'ui-input-field w-full rounded-xl border bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60';
</script>

{#if type === 'hidden'}
	<input {id} {name} type="hidden" bind:value {...rest} />
{:else}
	<div class={cn('ui-field flex flex-col gap-1.5', className)}>
		{#if type !== 'checkbox' && type !== 'radio'}
			<label for={id} class="text-sm font-medium text-neutral-300">
				{label}{#if required}<span class="ml-1 text-lime-300" aria-hidden="true">*</span>{/if}
			</label>
		{/if}

		{#if textarea}
			<textarea
				{id}
				{name}
				bind:value
				{placeholder}
				{required}
				{minlength}
				{maxlength}
				{disabled}
				{readonly}
				aria-invalid={Boolean(error)}
				aria-describedby={describedBy}
				rows="4"
				class={field}
				{...rest}
			></textarea>
		{:else if type === 'file'}
			<input
				{id}
				{name}
				type="file"
				bind:files
				{accept}
				{multiple}
				{required}
				{disabled}
				aria-invalid={Boolean(error)}
				aria-describedby={describedBy}
				class={field}
				{...rest}
			/>
		{:else if type === 'checkbox'}
			<label class="flex min-h-11 items-center gap-3 text-sm text-neutral-300">
				<input
					type="checkbox"
					{id}
					{name}
					{value}
					bind:checked
					{required}
					{disabled}
					aria-invalid={Boolean(error)}
					aria-describedby={describedBy}
					class="size-4 shrink-0 accent-lime-300 focus-visible:outline-2 focus-visible:outline-offset-2"
					{...rest}
				/>
				<span>{label}{#if required}<span class="ml-1 text-lime-300" aria-hidden="true">*</span>{/if}</span>
			</label>
		{:else if type === 'radio'}
			<label class="flex min-h-11 items-center gap-3 text-sm text-neutral-300">
				<input
					type="radio"
					{id}
					{name}
					{value}
					checked={groupValue === value}
					onchange={() => (groupValue = value)}
					{required}
					{disabled}
					aria-describedby={describedBy}
					class="size-4 shrink-0 accent-lime-300 focus-visible:outline-2 focus-visible:outline-offset-2"
					{...rest}
				/>
				<span>{label}{#if required}<span class="ml-1 text-lime-300" aria-hidden="true">*</span>{/if}</span>
			</label>
		{:else}
			<input
				{id}
				{name}
				{type}
				bind:value
				{placeholder}
				{required}
				{minlength}
				{maxlength}
				{min}
				{max}
				{step}
				{pattern}
				{autocomplete}
				{inputmode}
				{disabled}
				{readonly}
				aria-invalid={Boolean(error)}
				aria-describedby={describedBy}
				class={field}
				{...rest}
			/>
		{/if}

		{#if hint}<p id="{id}-hint" class="text-xs text-neutral-500">{hint}</p>{/if}
		{#if error}<p id="{id}-error" class="text-xs text-red-400" role="alert">{error}</p>{/if}
	</div>
{/if}

<style>
	.ui-input-field {
		border-color: var(--color-divider);
		box-shadow: 0 1px 0 color-mix(in srgb, var(--color-foreground) 3%, transparent);
	}

	.ui-input-field:focus {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 16%, transparent);
	}

	.ui-input-field[aria-invalid='true'] {
		border-color: color-mix(in srgb, #f87171 65%, transparent);
	}

	@media (prefers-reduced-motion: reduce) {
		.ui-input-field { transition: none; }
	}
</style>
