<script lang="ts">
	import type { Snippet } from 'svelte';
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
		optionIcon = undefined
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
		optionIcon?: Snippet<[Option]>;
	} = $props();

	const id = $props.id();
	let open = $state(false);
	let activeIndex = $state(0);
	let root = $state<HTMLDivElement | undefined>(undefined);
	let trigger = $state<HTMLButtonElement | undefined>(undefined);

	const selectedOption = $derived(options.find((option) => option.value === value) ?? null);
	const describedBy = $derived(
		[hint ? `${id}-hint` : null, error ? `${id}-error` : null]
			.filter(Boolean)
			.join(' ') || undefined
	);

	function firstEnabledIndex() {
		const selected = options.findIndex((option) => option.value === value && !option.disabled);
		if (selected >= 0) return selected;
		const first = options.findIndex((option) => !option.disabled);
		return Math.max(first, 0);
	}

	function openMenu() {
		if (disabled || options.length === 0) return;
		activeIndex = firstEnabledIndex();
		open = true;
	}

	function toggleMenu() {
		if (open) open = false;
		else openMenu();
	}

	function moveActive(direction: 1 | -1) {
		if (options.length === 0) return;
		let index = activeIndex;
		for (let attempt = 0; attempt < options.length; attempt += 1) {
			index = (index + direction + options.length) % options.length;
			if (!options[index]?.disabled) {
				activeIndex = index;
				return;
			}
		}
	}

	function choose(option: Option) {
		if (option.disabled) return;
		value = option.value;
		open = false;
		trigger?.focus();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!open) openMenu();
			else moveActive(event.key === 'ArrowDown' ? 1 : -1);
			return;
		}
		if (event.key === 'Home' && open) {
			event.preventDefault();
			activeIndex = firstEnabledIndex();
			return;
		}
		if (event.key === 'End' && open) {
			event.preventDefault();
			let lastEnabled = -1;
			for (let index = options.length - 1; index >= 0; index -= 1) {
				const option = options[index];
				if (option && !option.disabled) {
					lastEnabled = index;
					break;
				}
			}
			if (lastEnabled >= 0) activeIndex = lastEnabled;
			return;
		}
		if (event.key === 'Escape' && open) {
			event.preventDefault();
			open = false;
			return;
		}
		if ((event.key === 'Enter' || event.key === ' ') && open) {
			event.preventDefault();
			const option = options[activeIndex];
			if (option) choose(option);
		}
	}

	function closeOnOutsidePointerDown(event: PointerEvent) {
		if (event.target instanceof Node && open && !root?.contains(event.target)) open = false;
	}
</script>

<svelte:window onpointerdown={closeOnOutsidePointerDown} />

<div bind:this={root} class={cn('ovyn-field', className)}>
	<div class="ovyn-field-head">
		<label id="{id}-label" for={id} class="ovyn-field-label">
			{label}{#if required}<span class="ovyn-required" aria-hidden="true">*</span>{/if}
		</label>
	</div>

	<div class="ovyn-dropdown">
		<input type="hidden" {name} value={value} />
		<button
			id={id}
			bind:this={trigger}
			type="button"
			{disabled}
			onclick={toggleMenu}
			onkeydown={handleKeydown}
			class="ovyn-dropdown-trigger"
			role="combobox"
			aria-labelledby="{id}-label"
			aria-haspopup="listbox"
			aria-expanded={open}
			aria-controls="{id}-listbox"
			aria-activedescendant={open && options.length ? `${id}-option-${activeIndex}` : undefined}
			aria-required={required}
			aria-invalid={Boolean(error)}
			aria-describedby={describedBy}
		>
			<span class="ovyn-dropdown-selected">
				{#if selectedOption && optionIcon}
					<span class="ovyn-dropdown-icon">{@render optionIcon(selectedOption)}</span>
				{/if}
				<span class="ovyn-dropdown-value {selectedOption ? '' : 'is-placeholder'}">{selectedOption?.label ?? placeholder}</span>
			</span>
			<span class="ovyn-dropdown-caret {open ? 'is-open' : ''}" aria-hidden="true">
				<svg viewBox="0 0 24 24" fill="none">
					<path d="M6 9.5l6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</span>
		</button>

		<div id="{id}-listbox" class="ovyn-dropdown-panel" role="listbox" aria-labelledby="{id}-label" aria-hidden={!open}>
			{#each options as option, index (option.value)}
				{@const selected = value === option.value}
				{@const active = activeIndex === index}
				<button
					id="{id}-option-{index}"
					type="button"
					role="option"
					tabindex="-1"
					aria-selected={selected}
					aria-disabled={Boolean(option.disabled)}
					disabled={option.disabled}
					class={cn('ovyn-dropdown-option', active && 'is-active', selected && 'is-selected')}
					onpointermove={() => { if (!option.disabled) activeIndex = index; }}
					onclick={() => choose(option)}
				>
					{#if optionIcon}
						<span class="ovyn-dropdown-icon">{@render optionIcon(option)}</span>
					{:else}
						<span class="ovyn-dropdown-marker" aria-hidden="true"></span>
					{/if}
					<span class="ovyn-dropdown-option-label">{option.label}</span>
					{#if selected}<span class="ovyn-dropdown-check" aria-hidden="true">✓</span>{/if}
				</button>
			{/each}
		</div>
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
	.ovyn-field-error { color: var(--color-danger); font-size: 0.75rem; line-height: 1.5; }

	.ovyn-dropdown { position: relative; }

	.ovyn-dropdown-trigger {
		display: flex;
		width: 100%;
		min-height: 2.85rem;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border: 1px solid var(--color-divider);
		border-radius: 0.9rem;
		background: linear-gradient(160deg, color-mix(in srgb, var(--color-surface) 96%, transparent), color-mix(in srgb, var(--color-background) 86%, transparent));
		padding: 0.7rem 0.75rem 0.7rem 0.95rem;
		color: var(--color-foreground);
		font: inherit;
		font-size: 0.9rem;
		text-align: left;
		box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-foreground) 6%, transparent);
		transition: border-color 180ms ease, box-shadow 180ms ease;
	}

	.ovyn-dropdown-trigger:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--color-foreground) 20%, transparent);
	}

	.ovyn-dropdown-trigger:focus-visible {
		border-color: color-mix(in srgb, var(--color-accent) 58%, transparent);
		outline: none;
		box-shadow: 0 0 0 4px var(--color-accent-soft);
	}

	.ovyn-dropdown-trigger[aria-invalid='true'] {
		border-color: color-mix(in srgb, var(--color-danger) 62%, transparent);
	}

	.ovyn-dropdown-trigger:disabled { cursor: not-allowed; color: var(--color-muted); }
	.ovyn-dropdown-selected { display: flex; flex: 1 1 auto; min-width: 0; align-items: center; gap: 0.55rem; }
	.ovyn-dropdown-icon { display: grid; flex: 0 0 auto; place-items: center; }
	.ovyn-dropdown-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.ovyn-dropdown-value.is-placeholder { color: var(--color-muted); }

	.ovyn-dropdown-caret {
		display: grid;
		width: 1.55rem;
		height: 1.55rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 0.55rem;
		background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
		color: var(--color-accent);
		transition: transform 200ms ease, background-color 200ms ease;
	}

	.ovyn-dropdown-caret svg { width: 0.85rem; height: 0.85rem; }
	.ovyn-dropdown-caret.is-open { transform: rotate(180deg); background: var(--color-accent-soft); }

	.ovyn-dropdown-panel {
		position: absolute;
		z-index: 30;
		top: calc(100% + 0.4rem);
		right: 0;
		left: 0;
		max-height: 16rem;
		overflow-y: auto;
		border: 1px solid var(--color-divider);
		border-radius: 1rem;
		background: var(--color-menu-glass);
		padding: 0.4rem;
		box-shadow: 0 22px 48px rgb(0 0 0 / 32%);
		opacity: 1;
		visibility: hidden;
		pointer-events: none;
		transform: translateY(-0.35rem) scale(0.985);
		transform-origin: top center;
		transition: transform 170ms ease, visibility 0s linear 170ms;
	}

	.ovyn-dropdown-panel:not([aria-hidden='true']) {
		visibility: visible;
		pointer-events: auto;
		transform: translateY(0) scale(1);
		transition-delay: 0s;
	}

	.ovyn-dropdown-option {
		display: flex;
		width: 100%;
		min-height: 2.7rem;
		align-items: center;
		gap: 0.6rem;
		border: 1px solid transparent;
		border-radius: 0.7rem;
		background: transparent;
		padding: 0.55rem 0.7rem;
		color: var(--color-foreground);
		font: inherit;
		font-size: 0.85rem;
		text-align: left;
		transition: background-color 140ms ease, border-color 140ms ease;
	}

	.ovyn-dropdown-marker {
		width: 0.35rem;
		height: 0.35rem;
		flex: 0 0 auto;
		border-radius: 50%;
		background: color-mix(in srgb, var(--color-muted) 55%, transparent);
		transition: background-color 140ms ease, transform 140ms ease;
	}

	.ovyn-dropdown-option-label { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

	.ovyn-dropdown-check {
		color: var(--color-accent);
		font-family: var(--font-mono);
		font-size: 0.75rem;
	}

	.ovyn-dropdown-option.is-active {
		border-color: color-mix(in srgb, var(--color-accent) 22%, transparent);
		background: color-mix(in srgb, var(--color-accent) 7%, transparent);
	}

	.ovyn-dropdown-option.is-selected {
		border-color: color-mix(in srgb, var(--color-accent) 34%, transparent);
		background: var(--color-accent-soft);
	}

	.ovyn-dropdown-option.is-selected .ovyn-dropdown-marker,
	.ovyn-dropdown-option.is-active .ovyn-dropdown-marker {
		background: var(--color-accent);
		transform: scale(1.15);
	}

	.ovyn-dropdown-option:disabled { cursor: not-allowed; color: var(--color-muted); }

	.ovyn-dropdown-option:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 1px;
	}

	@media (prefers-reduced-motion: reduce) {
		.ovyn-dropdown-trigger,
		.ovyn-dropdown-caret,
		.ovyn-dropdown-panel { transition: none; }
	}
</style>
