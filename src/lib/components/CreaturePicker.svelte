<script lang="ts">
	import { untrack } from 'svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import CreatureLayer from '#lib/components/CreatureLayer.svelte';
	import CreatureThumb from '#lib/components/CreatureThumb.svelte';
	import {
		CREATURE_CATALOG,
		CREATURE_LIMIT,
		CREATURE_SIZE,
		creatureName,
		defaultCreatureSetting,
		type CreatureSetting
	} from '#lib/schemas/creatures';

	let { initial }: { initial: CreatureSetting[] } = $props();

	let list = $state<CreatureSetting[]>(untrack(() => initial.map((item) => ({ ...item }))));

	const shown = $derived(list.filter((item) => item.enabled));
	const payload = $derived(JSON.stringify({ version: 1, list }));

	function blurbs() {
		return CREATURE_CATALOG.reduce<Record<string, string>>((map, entry) => {
			map[entry.id] = entry.blurb;
			return map;
		}, {});
	}
	const copy = blurbs();

	function add(id: CreatureSetting['id']) {
		if (list.length >= CREATURE_LIMIT || list.some((item) => item.id === id)) return;
		list = [...list, defaultCreatureSetting(id)];
	}

	function remove(index: number) {
		list = list.filter((_, position) => position !== index);
	}

	function update(index: number, patch: Partial<CreatureSetting>) {
		list = list.map((item, position) => (position === index ? { ...item, ...patch } : item));
	}

	function numberValue(event: Event) {
		return Number((event.currentTarget as HTMLInputElement).value);
	}
</script>

<Card class="flex min-w-0 flex-col gap-5 p-5">
	<div>
		<h2 class="font-medium text-neutral-100">Living creatures</h2>
		<p class="mt-1 text-sm text-neutral-400">
			Add up to {CREATURE_LIMIT} animated creatures that drift across your public page. Each one moves on its own,
			within the page, and never blocks a link or a button.
		</p>
	</div>

	<div class="creature-stage">
		{#if shown.length > 0}
			<CreatureLayer settings={shown} preview />
		{:else}
			<p class="creature-empty">Add a creature below to see it fly.</p>
		{/if}
	</div>

	{#if list.length > 0}
		<ul class="flex flex-col gap-3">
			{#each list as creature, index (creature.id)}
				<li class="creature-row">
					<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
						<CreatureThumb species={creature.id} />
						<div class="min-w-0 flex-1 basis-40">
							<p class="truncate font-medium text-neutral-100">{creatureName(creature.id)}</p>
							<p class="truncate text-xs text-neutral-500">{copy[creature.id] ?? ''}</p>
						</div>
						<div class="ml-auto flex shrink-0 items-center gap-2">
							<label class="flex items-center gap-2 text-xs text-neutral-300">
								<input
									type="checkbox"
									checked={creature.enabled}
									onchange={(event) => update(index, { enabled: event.currentTarget.checked })}
								/>
								Shown
							</label>
							<button
								type="button"
								class="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-red-400/50 hover:text-red-300"
								onclick={() => remove(index)}
							>
								Remove
							</button>
						</div>
					</div>

					<div class="mt-3 grid gap-3 sm:grid-cols-3">
						<label class="creature-slider">
							<span>Size</span>
							<input
								type="range"
								min={CREATURE_SIZE.min}
								max={CREATURE_SIZE.max}
								step={CREATURE_SIZE.step}
								value={creature.size}
								oninput={(event) => update(index, { size: numberValue(event) })}
							/>
						</label>
						<label class="creature-slider">
							<span>Movement</span>
							<input
								type="range"
								min="0"
								max="1"
								step="0.05"
								value={creature.intensity}
								oninput={(event) => update(index, { intensity: numberValue(event) })}
							/>
						</label>
						<label class="creature-slider">
							<span>Animation</span>
							<input
								type="range"
								min="0"
								max="1"
								step="0.05"
								value={creature.density}
								oninput={(event) => update(index, { density: numberValue(event) })}
							/>
						</label>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-neutral-500">No creatures yet. Your page is calm and still.</p>
	{/if}

	<div>
		<p class="font-medium text-neutral-200">Add a creature</p>
		<div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
			{#each CREATURE_CATALOG as entry (entry.id)}
				{@const added = list.some((item) => item.id === entry.id)}
				<button
					type="button"
					class="creature-card"
					disabled={added || list.length >= CREATURE_LIMIT}
					onclick={() => add(entry.id)}
				>
					<CreatureThumb species={entry.id} />
					<span class="min-w-0 flex-1 overflow-hidden">
						<span class="block truncate text-sm font-medium text-neutral-100">{entry.name}</span>
						<span class="block truncate text-[10px] uppercase tracking-wider text-neutral-500">{added ? 'Added' : entry.group}</span>
					</span>
					<span class="shrink-0 text-lg text-neutral-500" aria-hidden="true">{added ? '✓' : '+'}</span>
				</button>
			{/each}
		</div>
	</div>

	<form method="POST" action="?/creatures" class="flex flex-wrap items-center gap-3">
		<input type="hidden" name="config" value={payload} />
		<Button type="submit">Save creatures</Button>
		<span class="font-mono text-xs text-neutral-500">{list.length} / {CREATURE_LIMIT}</span>
	</form>
</Card>

<style>
	.creature-stage {
		position: relative;
		height: clamp(11rem, 34vw, 16rem);
		overflow: hidden;
		border: 1px solid var(--color-divider);
		border-radius: 1.25rem;
		background:
			radial-gradient(ellipse at 30% 20%, color-mix(in srgb, var(--color-pop-lilac) 14%, transparent), transparent 60%),
			color-mix(in srgb, var(--color-background) 80%, transparent);
	}

	.creature-empty {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: var(--color-muted);
		font-size: 0.8rem;
	}

	.creature-row {
		border: 1px solid var(--color-divider);
		border-radius: 1rem;
		padding: 0.75rem 0.85rem;
	}

	.creature-slider {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		color: var(--color-muted);
		font-size: 0.66rem;
		font-weight: 600;
		letter-spacing: 0.03em;
	}

	.creature-slider input[type='range'] {
		width: 100%;
		accent-color: var(--color-accent);
	}

	.creature-row input[type='checkbox'] {
		accent-color: var(--color-accent);
	}

	.creature-card {
		display: flex;
		width: 100%;
		min-width: 0;
		align-items: center;
		gap: 0.6rem;
		border: 1px solid var(--color-divider);
		border-radius: 0.9rem;
		background: color-mix(in srgb, var(--color-surface) 70%, transparent);
		padding: 0.5rem 0.65rem;
		color: var(--color-foreground);
		text-align: left;
		cursor: pointer;
		transition: border-color 160ms ease, background-color 160ms ease;
	}

	.creature-card:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
		background: var(--color-accent-soft);
	}

	.creature-card:disabled { cursor: default; }

	@media (prefers-reduced-motion: reduce) {
		.creature-card { transition: none; }
	}
</style>
