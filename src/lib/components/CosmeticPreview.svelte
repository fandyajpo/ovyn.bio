<script lang="ts">
	import Avatar from '#lib/components/ui/Avatar.svelte';

	let {
		kind,
		name,
		assetUrl = null,
		accentColor = 'var(--color-accent)',
		limited = false
	}: {
		kind: 'frame' | 'wallpaper' | 'badge';
		name: string;
		assetUrl?: string | null;
		accentColor?: string | null;
		limited?: boolean;
	} = $props();
	const resolvedAccent = $derived(accentColor ?? 'var(--color-accent)');
</script>

<div role="img" aria-label={`Profile preview for ${name}`} class="cosmetic-preview">
	{#if kind === 'wallpaper'}
		{#if assetUrl}
			<img src={assetUrl} alt="" class="cosmetic-wallpaper" />
			<div class="wallpaper-scrim" aria-hidden="true"></div>
		{:else}
			<div class="wallpaper-fallback" style={`background: radial-gradient(circle at 75% 25%, ${resolvedAccent}, transparent 50%)`}></div>
		{/if}
		<span class="sticker sticker--dark absolute left-3 top-3">WALLPAPER ON</span>
		<div class="wallpaper-copy {assetUrl ? 'is-photo' : ''}">
			<Avatar name="Your profile" size="sm" />
			<div>
				<p class="wallpaper-name">your.name</p>
				<p class="wallpaper-handle">YOUR PROFILE</p>
			</div>
		</div>
	{:else}
		<div class="cosmetic-preview-card">
			<div class="relative">
				<Avatar name="Your profile" size="md" />
				{#if kind === 'frame'}
					{#if assetUrl}
						<img src={assetUrl} alt="" class="cosmetic-frame" />
					{:else}
						<span class="cosmetic-frame-fallback" style={`border-color: ${resolvedAccent}`}></span>
					{/if}
				{/if}
			</div>
			<div class="min-w-0">
				<div class="flex items-center gap-1.5">
					<p class="cosmetic-preview-name">your.name</p>
					{#if kind === 'badge'}
						{#if assetUrl}
							<img src={assetUrl} alt="" class="cosmetic-badge-art" />
						{:else}
							<span class="cosmetic-badge-fallback" style={`border-color: ${resolvedAccent}; color: ${resolvedAccent}`}>✓</span>
						{/if}
					{/if}
				</div>
				<p class="cosmetic-preview-caption">ovyn profile</p>
			</div>
		</div>
	{/if}
	{#if limited}<span class="sticker sticker--pink absolute bottom-2 right-2">LIMITED DROP</span>{/if}
	<span class="cosmetic-preview-kind">{kind} / preview</span>
</div>

<style>
	.cosmetic-preview {
		position: relative;
		display: flex;
		height: 9rem;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border: 1px solid var(--color-divider);
		border-radius: 1.15rem;
		background:
			radial-gradient(ellipse at 75% 20%, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 58%),
			var(--color-preview-stage);
	}

	.cosmetic-wallpaper {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.wallpaper-scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgb(0 0 0 / 78%), rgb(0 0 0 / 16%) 55%, transparent);
	}

	.wallpaper-fallback {
		position: absolute;
		inset: 0;
		opacity: 0.5;
	}

	.wallpaper-copy {
		position: absolute;
		bottom: 0.75rem;
		left: 0.75rem;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.wallpaper-name {
		color: var(--color-foreground);
		font-family: var(--font-display);
		font-size: 0.85rem;
		font-weight: 700;
	}

	.wallpaper-handle {
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.14em;
	}

	.wallpaper-copy.is-photo .wallpaper-name { color: #fff; }
	.wallpaper-copy.is-photo .wallpaper-handle { color: rgb(255 255 255 / 74%); }

	.cosmetic-preview-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		border: 1px solid var(--color-divider);
		border-radius: 1.1rem;
		background: color-mix(in srgb, var(--color-background) 58%, transparent);
		padding: 0.75rem 1rem;
		box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-foreground) 6%, transparent);
	}

	.cosmetic-frame {
		position: absolute;
		inset: -0.5rem;
		width: calc(100% + 1rem);
		height: calc(100% + 1rem);
		object-fit: contain;
		pointer-events: none;
	}

	.cosmetic-frame-fallback {
		position: absolute;
		inset: -0.25rem;
		border: 3px solid;
		border-radius: 50%;
		pointer-events: none;
	}

	.cosmetic-badge-art {
		width: 1.75rem;
		height: 1.75rem;
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 82%, transparent);
		padding: 0.12rem;
		object-fit: contain;
	}

	.cosmetic-badge-fallback {
		display: grid;
		width: 1.4rem;
		height: 1.4rem;
		place-items: center;
		border: 1px solid;
		border-radius: 50%;
		font-size: 0.7rem;
		font-weight: 700;
	}

	.cosmetic-preview-name {
		color: var(--color-foreground);
		font-family: var(--font-display);
		font-size: 0.85rem;
		font-weight: 700;
	}

	.cosmetic-preview-caption {
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.05em;
	}

	.cosmetic-preview-kind {
		position: absolute;
		top: 0.6rem;
		right: 0.75rem;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.55rem;
		letter-spacing: 0.05em;
		opacity: 0.8;
	}
</style>
