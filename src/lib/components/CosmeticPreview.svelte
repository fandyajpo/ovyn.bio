<script lang="ts">
	import Avatar from '#lib/components/ui/Avatar.svelte';

	let {
		kind,
		name,
		assetUrl = null,
		accentColor = '#D5FF35',
		limited = false
	}: {
		kind: 'frame' | 'wallpaper' | 'badge';
		name: string;
		assetUrl?: string | null;
		accentColor?: string | null;
		limited?: boolean;
	} = $props();
	const resolvedAccent = $derived(accentColor ?? '#D5FF35');
</script>

<div role="img" aria-label={`Profile preview for ${name}`} class="relative flex h-36 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#151714]">
	{#if kind === 'wallpaper'}
		{#if assetUrl}
			<img src={assetUrl} alt="" class="absolute inset-0 size-full object-cover" />
		{:else}
			<div class="absolute inset-0 opacity-50" style={`background: radial-gradient(circle at 75% 25%, ${resolvedAccent}, transparent 45%), #151714`}></div>
		{/if}
		<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent"></div>
		<span class="sticker sticker--dark absolute left-3 top-3">WALLPAPER ON</span>
		<div class="absolute bottom-3 left-3 flex items-center gap-2">
			<Avatar name="Your profile" size="sm" />
			<div><p class="font-[family-name:var(--font-display)] text-sm font-bold text-white">your.name</p><p class="font-mono text-[10px] text-white/70">YOUR PROFILE</p></div>
		</div>
	{:else}
		<div class="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
			<div class="relative">
				<Avatar name="Your profile" size="md" />
				{#if kind === 'frame'}
					{#if assetUrl}
						<img src={assetUrl} alt="" class="pointer-events-none absolute -inset-2 size-[calc(100%+16px)] object-contain" />
					{:else}
					<span class="pointer-events-none absolute -inset-1 rounded-full border-[3px]" style={`border-color: ${resolvedAccent}`}></span>
					{/if}
				{/if}
			</div>
			<div class="min-w-0">
				<div class="flex items-center gap-1.5">
					<p class="font-[family-name:var(--font-display)] text-sm font-bold text-neutral-100">your.name</p>
					{#if kind === 'badge'}
						{#if assetUrl}
							<img src={assetUrl} alt="" class="size-7 object-contain" />
						{:else}
							<span class="grid size-6 place-items-center rounded-full border text-xs font-bold" style={`border-color: ${resolvedAccent}; color: ${resolvedAccent}`}>✓</span>
						{/if}
					{/if}
				</div>
				<p class="font-mono text-[10px] uppercase tracking-widest text-neutral-500">OVYN PROFILE</p>
			</div>
		</div>
	{/if}
	{#if limited}<span class="sticker sticker--pink absolute bottom-2 right-2">LIMITED DROP</span>{/if}
	<span class="pointer-events-none absolute right-3 top-3 font-mono text-[9px] uppercase tracking-widest text-white/40">{kind} / preview</span>
</div>
