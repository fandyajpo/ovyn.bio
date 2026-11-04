<script lang="ts">
	import { cn } from '#lib/utils';

	let {
		name,
		label,
		value = $bindable(''),
		presets = ['#cdbcf3', '#efb5c9', '#acd7df', '#a5e082', '#f5d67b', '#f6f2f4'],
		hint = null,
		error = null,
		class: className
	}: {
		name: string;
		label: string;
		value?: string;
		presets?: string[];
		hint?: string | null;
		error?: string | null;
		class?: string;
	} = $props();

	const id = $props.id();
	let open = $state(false);
	let root = $state<HTMLDivElement | undefined>(undefined);
	let trigger = $state<HTMLButtonElement | undefined>(undefined);
	let hexInput = $state('');

	const normalised = $derived(/^#[0-9a-f]{6}$/i.test(value) ? value : '');
	const swatch = $derived(normalised || 'var(--color-accent)');
	const describedBy = $derived(
		[hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
	);

	function toggle() {
		open = !open;
	}

	function choose(next: string) {
		value = next;
		hexInput = '';
	}

	function onHexInput(event: Event) {
		hexInput = (event.currentTarget as HTMLInputElement).value;
	}

	function applyHex() {
		const raw = hexInput.trim().replace(/^#/, '');
		if (/^[0-9a-f]{6}$/i.test(raw)) choose(`#${raw.toLowerCase()}`);
		else if (raw === '') choose('');
	}

	function closeOnPointerDown(event: PointerEvent) {
		if (event.target instanceof Node && open && !root?.contains(event.target)) open = false;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			open = false;
			trigger?.focus();
		}
	}
</script>

<svelte:window onpointerdown={closeOnPointerDown} onkeydown={onKeydown} />

<div class={cn('color-field', className)} bind:this={root}>
	<span class="color-label">{label}</span>
	<input type="hidden" {name} value={value} />
	<button
		type="button"
		bind:this={trigger}
		class="color-trigger"
		aria-haspopup="dialog"
		aria-expanded={open}
		aria-describedby={describedBy}
		onclick={toggle}
	>
		<span class="color-dot" style={`background: ${swatch}`} aria-hidden="true"></span>
		<span class={normalised ? 'color-value' : 'color-value is-empty'}>{normalised || 'Theme accent'}</span>
		<svg class="color-caret {open ? 'is-open' : ''}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path d="M6 9.5l6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</button>

	{#if open}
		<div class="color-panel" role="dialog" aria-label={`${label} picker`}>
			<div class="color-top">
				<label class="color-native">
					<input type="color" value={normalised || '#cdbcf3'} aria-label="Custom colour" oninput={(event) => choose((event.currentTarget as HTMLInputElement).value)} />
					<span>Custom</span>
				</label>
				<input
					class="color-hex"
					type="text"
					placeholder={normalised || '#CDBCF3'}
					maxlength={7}
					value={hexInput}
					aria-label="Hex colour"
					oninput={onHexInput}
					onblur={applyHex}
					onkeydown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyHex(); } }}
				/>
			</div>

			<div class="color-swatches">
				{#each presets as preset (preset)}
					<button
						type="button"
						class="color-preset {normalised.toLowerCase() === preset.toLowerCase() ? 'is-selected' : ''}"
						style={`background: ${preset}`}
						aria-label={`Use ${preset}`}
						onclick={() => choose(preset)}
					></button>
				{/each}
			</div>

			<button type="button" class="color-clear" onclick={() => choose('')}>Use theme accent</button>
		</div>
	{/if}

	{#if hint}<p id="{id}-hint" class="color-hint">{hint}</p>{/if}
	{#if error}<p id="{id}-error" class="color-error" role="alert">{error}</p>{/if}
</div>

<style>
	.color-field {
		position: relative;
		display: grid;
		gap: 0.4rem;
		min-width: 0;
	}

	.color-label {
		color: var(--color-foreground);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.01em;
	}

	.color-trigger {
		display: flex;
		width: 100%;
		min-height: 2.85rem;
		align-items: center;
		gap: 0.6rem;
		border: 1px solid var(--color-divider);
		border-radius: 0.9rem;
		background: linear-gradient(160deg, color-mix(in srgb, var(--color-surface) 96%, transparent), color-mix(in srgb, var(--color-background) 86%, transparent));
		padding: 0.55rem 0.7rem 0.55rem 0.65rem;
		color: var(--color-foreground);
		font: inherit;
		font-size: 0.85rem;
		text-align: left;
		cursor: pointer;
		transition: border-color 180ms ease, box-shadow 180ms ease;
	}

	.color-trigger:hover { border-color: color-mix(in srgb, var(--color-foreground) 20%, transparent); }

	.color-trigger:focus-visible {
		border-color: color-mix(in srgb, var(--color-accent) 58%, transparent);
		outline: none;
		box-shadow: 0 0 0 4px var(--color-accent-soft);
	}

	.color-dot {
		width: 1.5rem;
		height: 1.5rem;
		flex: 0 0 auto;
		border: 1px solid var(--color-divider);
		border-radius: 0.55rem;
		box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-foreground) 14%, transparent);
	}

	.color-value { flex: 1; min-width: 0; font-family: var(--font-mono); font-size: 0.8rem; }
	.color-value.is-empty { color: var(--color-muted); font-family: inherit; font-size: 0.82rem; }

	.color-caret {
		width: 1rem;
		height: 1rem;
		color: var(--color-muted);
		transition: transform 200ms ease;
	}

	.color-caret.is-open { transform: rotate(180deg); }

	.color-panel {
		position: absolute;
		z-index: 30;
		top: calc(100% + 0.4rem);
		left: 0;
		width: min(18rem, 90vw);
		border: 1px solid var(--color-divider);
		border-radius: 1rem;
		background: var(--color-menu-glass);
		padding: 0.75rem;
		box-shadow: 0 22px 48px rgb(0 0 0 / 32%);
		display: grid;
		gap: 0.65rem;
	}

	.color-top { display: flex; align-items: center; gap: 0.5rem; }

	.color-native {
		display: inline-flex;
		min-height: 2.35rem;
		align-items: center;
		gap: 0.45rem;
		border: 1px solid var(--color-divider);
		border-radius: 0.7rem;
		padding: 0.25rem 0.6rem 0.25rem 0.3rem;
		cursor: pointer;
		font-size: 0.72rem;
		color: var(--color-muted);
	}

	.color-native input[type='color'] {
		width: 1.9rem;
		height: 1.6rem;
		padding: 0;
		border: 0;
		border-radius: 0.5rem;
		background: transparent;
		cursor: pointer;
	}

	.color-hex {
		width: 100%;
		min-width: 0;
		border: 1px solid var(--color-divider);
		border-radius: 0.7rem;
		background: color-mix(in srgb, var(--color-background) 70%, transparent);
		padding: 0.5rem 0.6rem;
		color: var(--color-foreground);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		letter-spacing: 0.02em;
	}

	.color-hex:focus { outline: none; border-color: color-mix(in srgb, var(--color-accent) 55%, transparent); }

	.color-swatches { display: flex; flex-wrap: wrap; gap: 0.4rem; }

	.color-preset {
		width: 1.8rem;
		height: 1.8rem;
		border: 1px solid var(--color-divider);
		border-radius: 0.55rem;
		cursor: pointer;
		transition: transform 150ms ease, border-color 150ms ease;
	}

	.color-preset:hover { transform: translateY(-2px); }
	.color-preset.is-selected { border-color: var(--color-accent); box-shadow: 0 0 0 2px var(--color-accent-soft); }

	.color-clear {
		border: 0;
		background: none;
		padding: 0.2rem 0;
		color: var(--color-muted);
		font: inherit;
		font-size: 0.72rem;
		text-align: left;
		cursor: pointer;
	}

	.color-clear:hover { color: var(--color-foreground); }

	.color-hint { color: var(--color-muted); font-size: 0.7rem; line-height: 1.5; }
	.color-error { color: var(--color-danger); font-size: 0.75rem; line-height: 1.5; }

	@media (prefers-reduced-motion: reduce) {
		.color-trigger,
		.color-caret,
		.color-preset { transition: none; }
	}
</style>
