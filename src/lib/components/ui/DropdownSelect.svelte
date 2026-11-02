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
		class: className
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

<div bind:this={root} class={cn('relative flex flex-col gap-1.5', className)}>
	<label id="{id}-label" for={id} class="text-sm font-medium text-neutral-300">
		{label}{#if required}<span class="ml-1 text-lime-300" aria-hidden="true">*</span>{/if}
	</label>
	<div class="dropdown-control">
		<input type="hidden" {name} value={value} />
		<button
			id={id}
			bind:this={trigger}
			type="button"
			disabled={disabled}
			onclick={toggleMenu}
			onkeydown={handleKeydown}
			class="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-left text-sm text-neutral-100 outline-none transition-colors focus:border-lime-300 focus:ring-1 focus:ring-lime-300/40 disabled:cursor-not-allowed disabled:opacity-60"
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
			<span class={selectedOption ? 'truncate' : 'truncate text-neutral-500'}>{selectedOption?.label ?? placeholder}</span>
			<span class="shrink-0 font-mono text-neutral-500" aria-hidden="true">{open ? '⌃' : '⌄'}</span>
		</button>

		<div id="{id}-listbox" class="dropdown-options" role="listbox" aria-labelledby="{id}-label" aria-hidden={!open}>
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
					class={cn('dropdown-option', active && 'dropdown-option--active', selected && 'dropdown-option--selected')}
					onpointermove={() => { if (!option.disabled) activeIndex = index; }}
					onclick={() => choose(option)}
				>
					<span>{option.label}</span>
					{#if selected}<span class="font-mono text-lime-300" aria-hidden="true">✓</span>{/if}
				</button>
			{/each}
		</div>
	</div>

	{#if hint}<p id="{id}-hint" class="text-xs text-neutral-500">{hint}</p>{/if}
	{#if error}<p id="{id}-error" class="text-xs text-red-400" role="alert">{error}</p>{/if}
</div>

<style>
	.dropdown-control {
		position: relative;
	}

	.dropdown-options {
		position: absolute;
		z-index: 30;
		top: calc(100% + 0.35rem);
		right: 0;
		left: 0;
		max-height: 16rem;
		overflow-y: auto;
		border: 1px solid var(--color-divider);
		border-radius: 0.9rem;
		background: var(--color-menu-glass);
		padding: 0.35rem;
		box-shadow: 0 18px 40px rgb(0 0 0 / 35%);
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transform: translateY(-0.35rem);
		transition: opacity 140ms ease, transform 140ms ease, visibility 0s linear 140ms;
	}

	.dropdown-options:not([aria-hidden='true']) {
		opacity: 1;
		visibility: visible;
		pointer-events: auto;
		transform: translateY(0);
		transition-delay: 0s;
	}

	.dropdown-option {
		display: flex;
		width: 100%;
		min-height: 2.75rem;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border: 1px solid transparent;
		border-radius: 0.65rem;
		background: transparent;
		padding: 0.6rem 0.75rem;
		color: var(--color-foreground);
		text-align: left;
	}

	.dropdown-option--active,
	.dropdown-option--selected {
		border-color: color-mix(in srgb, var(--color-accent) 28%, transparent);
		background: var(--color-accent-soft);
	}

	.dropdown-option:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 1px;
	}

	@media (prefers-reduced-motion: reduce) {
		.dropdown-options { transition: none; }
	}
</style>
