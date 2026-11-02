<script lang="ts">
	import type { FullAutoFill } from 'svelte/elements';
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
		autocomplete?: FullAutoFill;
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
	const showCounter = $derived(Boolean(maxlength && (textarea || type === 'text')));
	const charCount = $derived(typeof value === 'string' ? value.length : 0);
</script>

{#if type === 'hidden'}
	<input {id} {name} type="hidden" bind:value {...rest} />
{:else}
	<div class={cn('ovyn-field', className)}>
		{#if type !== 'checkbox' && type !== 'radio'}
			<div class="ovyn-field-head">
				<label for={id} class="ovyn-field-label">
					{label}{#if required}<span class="ovyn-required" aria-hidden="true">*</span>{/if}
				</label>
				{#if showCounter}
					<span class="ovyn-field-meta">{charCount}/{maxlength}</span>
				{/if}
			</div>
		{/if}

		{#if textarea}
			<div class="ovyn-control">
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
					class="ovyn-input ovyn-input--textarea"
					{...rest}
				></textarea>
			</div>
		{:else if type === 'file'}
			<div class="ovyn-control">
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
					class="ovyn-file"
					{...rest}
				/>
			</div>
		{:else if type === 'checkbox'}
			<label class="ovyn-choice">
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
					class="ovyn-choice-input"
					{...rest}
				/>
				<span class="ovyn-choice-box" aria-hidden="true">
					<svg viewBox="0 0 20 20" fill="none">
						<path d="M4.8 10.4l3.3 3.3L15.2 6.6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</span>
				<span class="ovyn-choice-text">{label}{#if required}<span class="ovyn-required" aria-hidden="true">*</span>{/if}</span>
			</label>
		{:else if type === 'radio'}
			<label class="ovyn-choice">
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
					class="ovyn-choice-input"
					{...rest}
				/>
				<span class="ovyn-choice-box ovyn-choice-box--round" aria-hidden="true">
					<span class="ovyn-choice-dot"></span>
				</span>
				<span class="ovyn-choice-text">{label}{#if required}<span class="ovyn-required" aria-hidden="true">*</span>{/if}</span>
			</label>
		{:else}
			<div class="ovyn-control">
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
					class="ovyn-input"
					{...rest}
				/>
			</div>
		{/if}

		{#if hint}<p id="{id}-hint" class="ovyn-field-hint">{hint}</p>{/if}
		{#if error}<p id="{id}-error" class="ovyn-field-error" role="alert">{error}</p>{/if}
	</div>
{/if}

<style>
	.ovyn-field {
		display: grid;
		gap: 0.45rem;
		min-width: 0;
	}

	.ovyn-field-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.ovyn-field-label {
		color: var(--color-foreground);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.01em;
	}

	.ovyn-required { margin-left: 0.2rem; color: var(--color-pop-pink); }

	.ovyn-field-meta {
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 0.06em;
		opacity: 0.85;
	}

	.ovyn-field-hint { color: var(--color-muted); font-size: 0.7rem; line-height: 1.5; }
	.ovyn-field-error { color: var(--color-danger); font-size: 0.75rem; line-height: 1.5; }

	.ovyn-control {
		position: relative;
		display: flex;
		min-width: 0;
	}

	.ovyn-control::after {
		position: absolute;
		right: 0.95rem;
		bottom: 0.3rem;
		left: 0.95rem;
		height: 1px;
		background: linear-gradient(90deg, var(--color-accent), var(--color-pop-pink), var(--color-pop-blue));
		content: '';
		pointer-events: none;
		opacity: 0.85;
		transform: scaleX(0);
		transform-origin: left center;
		transition: transform 260ms cubic-bezier(0.2, 0.75, 0.25, 1);
	}

	.ovyn-control:focus-within::after { transform: scaleX(1); }

	.ovyn-input {
		width: 100%;
		min-width: 0;
		border: 1px solid var(--color-divider);
		border-radius: 0.9rem;
		background: linear-gradient(160deg, color-mix(in srgb, var(--color-surface) 96%, transparent), color-mix(in srgb, var(--color-background) 86%, transparent));
		padding: 0.7rem 0.95rem;
		color: var(--color-foreground);
		font: inherit;
		font-size: 0.9rem;
		box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-foreground) 6%, transparent);
		transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
	}

	.ovyn-input::placeholder { color: color-mix(in srgb, var(--color-muted) 82%, transparent); }

	.ovyn-input:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--color-foreground) 20%, transparent);
	}

	.ovyn-input:focus {
		border-color: color-mix(in srgb, var(--color-accent) 58%, transparent);
		outline: none;
		box-shadow: 0 0 0 4px var(--color-accent-soft), inset 0 1px 0 color-mix(in srgb, var(--color-foreground) 8%, transparent);
	}

	.ovyn-input[aria-invalid='true'] {
		border-color: color-mix(in srgb, var(--color-danger) 62%, transparent);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-danger) 14%, transparent);
	}

	.ovyn-input:disabled,
	.ovyn-input[readonly] { cursor: default; color: color-mix(in srgb, var(--color-muted) 92%, transparent); }

	.ovyn-input--textarea {
		min-height: 7.5rem;
		border-radius: 1.05rem;
		line-height: 1.6;
		resize: vertical;
	}

	.ovyn-file {
		width: 100%;
		border: 1px dashed color-mix(in srgb, var(--color-foreground) 18%, transparent);
		border-radius: 1rem;
		background: color-mix(in srgb, var(--color-surface) 62%, transparent);
		padding: 0.65rem;
		color: var(--color-muted);
		font: inherit;
		font-size: 0.8rem;
		transition: border-color 180ms ease, background-color 180ms ease;
	}

	.ovyn-file:hover { border-color: color-mix(in srgb, var(--color-accent) 45%, transparent); }

	.ovyn-file::file-selector-button {
		margin-right: 0.75rem;
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: var(--color-accent-soft);
		padding: 0.4rem 0.8rem;
		color: var(--color-accent);
		font: inherit;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}

	.ovyn-choice {
		display: flex;
		min-height: 2.75rem;
		align-items: center;
		gap: 0.7rem;
		cursor: pointer;
	}

	.ovyn-choice-input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
	}

	.ovyn-choice-box {
		display: grid;
		width: 1.25rem;
		height: 1.25rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid color-mix(in srgb, var(--color-foreground) 22%, transparent);
		border-radius: 0.45rem;
		background: color-mix(in srgb, var(--color-surface) 92%, transparent);
		color: var(--color-on-accent);
		transition: border-color 170ms ease, background 170ms ease, transform 170ms ease;
	}

	.ovyn-choice-box svg {
		width: 0.85rem;
		height: 0.85rem;
		opacity: 0;
		transform: scale(0.6);
		transition: opacity 150ms ease, transform 150ms ease;
	}

	.ovyn-choice-box--round { border-radius: 50%; }

	.ovyn-choice-dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 50%;
		background: currentColor;
		opacity: 0;
		transform: scale(0.4);
		transition: opacity 150ms ease, transform 150ms ease;
	}

	.ovyn-choice-input:checked + .ovyn-choice-box {
		border-color: color-mix(in srgb, var(--color-accent) 72%, transparent);
		background: linear-gradient(150deg, var(--color-accent), color-mix(in srgb, var(--color-pop-lilac) 70%, var(--color-accent)));
		transform: scale(1.04);
	}

	.ovyn-choice-input:checked + .ovyn-choice-box svg,
	.ovyn-choice-input:checked + .ovyn-choice-box .ovyn-choice-dot {
		opacity: 1;
		transform: scale(1);
	}

	.ovyn-choice-input:focus-visible + .ovyn-choice-box {
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
	}

	.ovyn-choice-input:disabled + .ovyn-choice-box { border-color: var(--color-divider); }

	.ovyn-choice-text {
		color: var(--color-foreground);
		font-size: 0.82rem;
		line-height: 1.5;
	}

	.ovyn-choice:has(input:disabled) { cursor: not-allowed; color: var(--color-muted); }

	@media (prefers-reduced-motion: reduce) {
		.ovyn-control::after,
		.ovyn-input,
		.ovyn-choice-box,
		.ovyn-choice-box svg,
		.ovyn-choice-dot { transition: none; }
	}
</style>
