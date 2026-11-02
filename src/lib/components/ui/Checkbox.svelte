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

<div class={cn('ovyn-checkbox-field', className)}>
	<label for={id} class="ovyn-checkbox">
		<input
			{id}
			{name}
			{value}
			type="checkbox"
			bind:checked
			{disabled}
			{required}
			aria-invalid={Boolean(error)}
			aria-describedby={describedBy}
			class="ovyn-checkbox-input"
		/>
		<span class="ovyn-checkbox-box" aria-hidden="true">
			<svg viewBox="0 0 20 20" fill="none">
				<path d="M4.8 10.4l3.3 3.3L15.2 6.6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</span>
		<span class="ovyn-checkbox-text">{label}{#if required}<span class="ovyn-required" aria-hidden="true">*</span>{/if}</span>
	</label>
	{#if hint}<p id="{id}-hint" class="ovyn-checkbox-hint">{hint}</p>{/if}
	{#if error}<p id="{id}-error" class="ovyn-checkbox-error" role="alert">{error}</p>{/if}
</div>

<style>
	.ovyn-checkbox-field { display: grid; gap: 0.35rem; min-width: 0; }

	.ovyn-checkbox {
		display: flex;
		min-height: 2.75rem;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
	}

	.ovyn-checkbox-input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
	}

	.ovyn-checkbox-box {
		display: grid;
		width: 1.4rem;
		height: 1.4rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid color-mix(in srgb, var(--color-foreground) 24%, transparent);
		border-radius: 0.5rem;
		background: linear-gradient(160deg, color-mix(in srgb, var(--color-surface) 96%, transparent), color-mix(in srgb, var(--color-background) 88%, transparent));
		color: var(--color-on-accent);
		box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-foreground) 8%, transparent);
		transition: border-color 180ms ease, background 180ms ease, transform 180ms ease, box-shadow 180ms ease;
	}

	.ovyn-checkbox-box svg {
		width: 0.9rem;
		height: 0.9rem;
		opacity: 0;
		transform: scale(0.55);
		transition: opacity 160ms ease, transform 160ms cubic-bezier(0.2, 0.9, 0.3, 1.4);
	}

	.ovyn-checkbox:hover .ovyn-checkbox-box {
		border-color: color-mix(in srgb, var(--color-accent) 48%, transparent);
	}

	.ovyn-checkbox-input:checked + .ovyn-checkbox-box {
		border-color: color-mix(in srgb, var(--color-accent) 78%, transparent);
		background: linear-gradient(150deg, var(--color-accent), color-mix(in srgb, var(--color-pop-lilac) 65%, var(--color-accent)));
		box-shadow: 0 6px 18px color-mix(in srgb, var(--color-accent) 26%, transparent);
		transform: scale(1.04);
	}

	.ovyn-checkbox-input:checked + .ovyn-checkbox-box svg {
		opacity: 1;
		transform: scale(1);
	}

	.ovyn-checkbox-input:focus-visible + .ovyn-checkbox-box {
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
	}

	.ovyn-checkbox-input:disabled + .ovyn-checkbox-box { border-color: var(--color-divider); }
	.ovyn-checkbox:has(input:disabled) { cursor: not-allowed; color: var(--color-muted); }

	.ovyn-checkbox-text {
		color: var(--color-foreground);
		font-size: 0.85rem;
		line-height: 1.5;
	}

	.ovyn-required { margin-left: 0.2rem; color: var(--color-pop-pink); }
	.ovyn-checkbox-hint { padding-left: 2.15rem; color: var(--color-muted); font-size: 0.7rem; line-height: 1.5; }
	.ovyn-checkbox-error { padding-left: 2.15rem; color: var(--color-danger); font-size: 0.75rem; line-height: 1.5; }

	@media (prefers-reduced-motion: reduce) {
		.ovyn-checkbox-box,
		.ovyn-checkbox-box svg { transition: none; }
	}
</style>
