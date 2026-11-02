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

<div class={cn('ovyn-field', className)}>
	<div class="ovyn-field-head">
		<label for={id} class="ovyn-field-label">
			{label}{#if required}<span class="ovyn-required" aria-hidden="true">*</span>{/if}
		</label>
	</div>

	<div class="ovyn-select">
		<select
			{...rest}
			{id}
			{name}
			bind:value
			{required}
			{disabled}
			aria-invalid={Boolean(error)}
			aria-describedby={describedBy}
			class="ovyn-select-native"
		>
			<option value="" disabled={required}>{placeholder}</option>
			{#each options as option (option.value)}
				<option value={option.value} disabled={option.disabled}>{option.label}</option>
			{/each}
		</select>
		<span class="ovyn-select-caret" aria-hidden="true">
			<svg viewBox="0 0 24 24" fill="none">
				<path d="M6 9.5l6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</span>
	</div>

	{#if hint}<p id="{id}-hint" class="ovyn-field-hint">{hint}</p>{/if}
	{#if error}<p id="{id}-error" class="ovyn-field-error" role="alert">{error}</p>{/if}
</div>

<style>
	.ovyn-field { display: grid; gap: 0.45rem; min-width: 0; }
	.ovyn-field-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; }

	.ovyn-field-label {
		color: var(--color-foreground);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.01em;
	}

	.ovyn-required { margin-left: 0.2rem; color: var(--color-pop-pink); }
	.ovyn-field-hint { color: var(--color-muted); font-size: 0.7rem; line-height: 1.5; }
	.ovyn-field-error { color: #f87171; font-size: 0.75rem; line-height: 1.5; }

	.ovyn-select { position: relative; }

	.ovyn-select-native {
		width: 100%;
		min-height: 2.85rem;
		appearance: none;
		border: 1px solid var(--color-divider);
		border-radius: 0.9rem;
		background: linear-gradient(160deg, color-mix(in srgb, var(--color-surface) 96%, transparent), color-mix(in srgb, var(--color-background) 86%, transparent));
		padding: 0.7rem 2.6rem 0.7rem 0.95rem;
		color: var(--color-foreground);
		font: inherit;
		font-size: 0.9rem;
		box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-foreground) 6%, transparent);
		transition: border-color 180ms ease, box-shadow 180ms ease;
	}

	.ovyn-select-native:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--color-foreground) 20%, transparent);
	}

	.ovyn-select-native:focus {
		border-color: color-mix(in srgb, var(--color-accent) 58%, transparent);
		outline: none;
		box-shadow: 0 0 0 4px var(--color-accent-soft);
	}

	.ovyn-select-native[aria-invalid='true'] {
		border-color: color-mix(in srgb, #f87171 62%, transparent);
		box-shadow: 0 0 0 4px color-mix(in srgb, #f87171 14%, transparent);
	}

	.ovyn-select-native:disabled { cursor: not-allowed; opacity: 0.6; }

	.ovyn-select-caret {
		position: absolute;
		top: 50%;
		right: 0.65rem;
		display: grid;
		width: 1.55rem;
		height: 1.55rem;
		place-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 0.55rem;
		background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
		color: var(--color-accent);
		pointer-events: none;
		transform: translateY(-50%);
	}

	.ovyn-select-caret svg { width: 0.85rem; height: 0.85rem; }

	@media (prefers-reduced-motion: reduce) {
		.ovyn-select-native { transition: none; }
	}
</style>
