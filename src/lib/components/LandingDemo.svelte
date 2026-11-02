<script lang="ts">
	let { name = '' }: { name?: string } = $props();

	const tags = ['personal brand', 'circle', 'flex', 'expression'];

	const displayName = $derived(name.trim() || 'your name');
	const handle = $derived(
		displayName
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 24) || 'your-name'
	);
	const initial = $derived(displayName.trim().charAt(0).toUpperCase() || 'Y');
</script>

<div
	class="demo"
	role="img"
	aria-label="An animated preview of an ovyn page building itself: cover, avatar, name, bio, social links, a content grid and a badge appear one after another, then the words personal brand, circle, flex and expression."
>
	<div class="demo-frame">
		<div class="demo-bar">
			<span class="demo-dots" aria-hidden="true"><i></i><i></i><i></i></span>
			<span class="demo-url">ovyn.bio/{handle}</span>
			<span class="demo-live"><span class="status-dot"></span>live</span>
		</div>

		<div class="demo-page">
			<div class="demo-banner demo-piece" style="--i: 0">
				<span class="demo-banner-glow" aria-hidden="true"></span>
			</div>

			<div class="demo-identity demo-piece" style="--i: 1">
				<span class="demo-avatar">{initial}</span>
				<span class="demo-id-lines">
					<strong class="demo-name">{displayName}</strong>
					<span class="demo-handle">@{handle}</span>
				</span>
			</div>

			<div class="demo-bio demo-piece" style="--i: 2">
				<i></i>
				<i></i>
			</div>

			<div class="demo-links demo-piece" style="--i: 3">
				<span class="demo-chip demo-chip--pink">YouTube</span>
				<span class="demo-chip demo-chip--blue">Spotify</span>
				<span class="demo-chip demo-chip--lilac">Instagram</span>
			</div>

			<div class="demo-grid demo-piece" style="--i: 4">
				<span class="demo-cell">
					<span class="demo-cell-head"></span>
					<span class="demo-cell-line"></span>
					<span class="demo-cell-line demo-cell-line--short"></span>
				</span>
				<span class="demo-cell">
					<span class="demo-cell-head"></span>
					<span class="demo-cell-line"></span>
					<span class="demo-cell-line demo-cell-line--short"></span>
				</span>
			</div>

			<div class="demo-badge demo-piece" style="--i: 5">
				<span aria-hidden="true">✦</span> verified vibes
			</div>
		</div>
	</div>

	<div class="demo-tags">
		{#each tags as tag, index (tag)}
			<span class="demo-tag" style={`--i: ${index}`}>{tag}</span>
		{/each}
	</div>
</div>

<style>
	.demo {
		display: grid;
		gap: 1rem;
		width: 100%;
	}

	.demo-frame {
		width: 100%;
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--color-foreground) 10%, transparent);
		border-radius: 1.6rem;
		background: linear-gradient(150deg, color-mix(in srgb, var(--color-surface) 90%, transparent), color-mix(in srgb, var(--color-background) 94%, transparent));
		box-shadow: 0 26px 56px rgb(0 0 0 / 20%);
	}

	.demo-bar {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		border-bottom: 1px solid var(--color-divider);
		padding: 0.6rem 0.85rem;
	}

	.demo-dots { display: inline-flex; gap: 0.3rem; }

	.demo-dots i {
		display: block;
		width: 0.42rem;
		height: 0.42rem;
		border-radius: 50%;
		background: color-mix(in srgb, var(--color-muted) 45%, transparent);
	}

	.demo-url {
		min-width: 0;
		flex: 1;
		overflow: hidden;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 70%, transparent);
		padding: 0.2rem 0.55rem;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.6rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.demo-live {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.55rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.demo-page {
		display: grid;
		gap: 0.85rem;
		padding: 0 1rem 1.15rem;
	}

	.demo-banner {
		position: relative;
		height: 4rem;
		margin-top: 0.9rem;
		overflow: hidden;
		border-radius: 1rem;
		background:
			radial-gradient(ellipse at 18% 12%, color-mix(in srgb, var(--color-pop-pink) 36%, transparent), transparent 62%),
			linear-gradient(120deg, color-mix(in srgb, var(--color-accent) 34%, var(--color-surface)), color-mix(in srgb, var(--color-pop-blue) 26%, var(--color-surface)));
	}

	.demo-banner-glow {
		position: absolute;
		inset: 0;
		background: linear-gradient(100deg, transparent 32%, rgb(255 255 255 / 18%) 48%, transparent 64%);
		animation: demo-sheen 6.5s ease-in-out infinite;
	}

	.demo-identity {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		margin-top: -1.7rem;
		padding-left: 0.35rem;
	}

	.demo-avatar {
		display: grid;
		width: 3rem;
		height: 3rem;
		flex: 0 0 auto;
		place-items: center;
		border: 2px solid var(--color-background);
		border-radius: 999px;
		background: linear-gradient(140deg, var(--color-accent), color-mix(in srgb, var(--color-pop-blue) 60%, var(--color-accent)));
		color: var(--color-on-accent);
		font-family: var(--font-display);
		font-size: 1.1rem;
		font-weight: 700;
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-accent) 42%, transparent);
	}

	.demo-id-lines { display: grid; flex: 1; gap: 0.32rem; min-width: 0; }

	.demo-name {
		display: block;
		overflow: hidden;
		color: var(--color-foreground);
		font-family: var(--font-display);
		font-size: 0.98rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.demo-handle {
		display: block;
		overflow: hidden;
		color: var(--color-accent);
		font-family: var(--font-mono);
		font-size: 0.62rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.demo-bio { display: grid; gap: 0.3rem; padding-inline: 0.35rem; }

	.demo-bio i { display: block; height: 0.34rem; border-radius: 999px; background: color-mix(in srgb, var(--color-muted) 34%, transparent); }
	.demo-bio i:first-child { width: 88%; }
	.demo-bio i:last-child { width: 60%; }

	.demo-links { display: flex; flex-wrap: wrap; gap: 0.35rem; padding-inline: 0.35rem; }

	.demo-chip {
		border-radius: 999px;
		padding: 0.26rem 0.6rem;
		font-size: 0.6rem;
		font-weight: 600;
		letter-spacing: 0.02em;
	}

	.demo-chip--pink { background: color-mix(in srgb, var(--color-pop-pink) 22%, transparent); color: var(--color-pop-pink); }
	.demo-chip--blue { background: color-mix(in srgb, var(--color-pop-blue) 24%, transparent); color: var(--color-pop-blue); }
	.demo-chip--lilac { background: var(--color-accent-soft); color: var(--color-accent); }

	.demo-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.45rem;
		padding-inline: 0.35rem;
	}

	.demo-cell {
		display: grid;
		gap: 0.3rem;
		border: 1px solid var(--color-divider);
		border-radius: 0.7rem;
		background: color-mix(in srgb, var(--color-surface) 60%, transparent);
		padding: 0.5rem 0.55rem;
	}

	.demo-cell-head { display: block; width: 55%; height: 0.4rem; border-radius: 999px; background: color-mix(in srgb, var(--color-accent) 55%, transparent); }
	.demo-cell-line { display: block; height: 0.28rem; border-radius: 999px; background: color-mix(in srgb, var(--color-muted) 30%, transparent); }
	.demo-cell-line--short { width: 70%; }

	.demo-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		width: fit-content;
		margin-inline: 0.35rem;
		border: 1px solid color-mix(in srgb, var(--color-pop-pink) 34%, transparent);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-pop-pink) 12%, transparent);
		padding: 0.26rem 0.6rem;
		color: var(--color-pop-pink);
		font-size: 0.6rem;
		font-weight: 600;
	}

	.demo-tags { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem; }

	.demo-tag {
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 78%, transparent);
		padding: 0.28rem 0.65rem;
		color: var(--color-muted);
		font-size: 0.61rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.demo-piece,
	.demo-tag {
		animation: demo-rise 13s cubic-bezier(0.22, 0.68, 0.24, 1) infinite both;
	}

	.demo-piece { animation-delay: calc(var(--i, 0) * 0.45s); }
	.demo-tag { animation-delay: calc(2.3s + var(--i, 0) * 0.18s); }

	@keyframes demo-rise {
		0% { opacity: 0; transform: translate3d(0, 14px, 0); }
		8% { opacity: 1; transform: translate3d(0, 0, 0); }
		90% { opacity: 1; transform: translate3d(0, 0, 0); }
		100% { opacity: 0; transform: translate3d(0, 0, 0); }
	}

	@keyframes demo-sheen {
		0%, 100% { transform: translateX(-60%); }
		55% { transform: translateX(60%); }
	}

	@media (prefers-reduced-motion: reduce) {
		.demo-piece,
		.demo-tag,
		.demo-banner-glow {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
