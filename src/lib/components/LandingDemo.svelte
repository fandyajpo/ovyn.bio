<script lang="ts">
	const tags = ['personal brand', 'circle', 'flex', 'expression'];
</script>

<div
	class="demo"
	role="img"
	aria-label="An animated preview of an ovyn page building itself: cover, avatar, name, bio, links, a grid of content and a badge, then the words personal brand, circle, flex and expression."
>
	<div class="demo-frame">
		<div class="demo-bar">
			<span class="demo-dots" aria-hidden="true"><i></i><i></i><i></i></span>
			<span class="demo-url">ovyn.bio/your-name</span>
			<span class="demo-live"><span class="status-dot"></span>live</span>
		</div>

		<div class="demo-page">
			<div class="demo-piece demo-banner" style="--i: 0">
				<span class="demo-banner-glow" aria-hidden="true"></span>
			</div>

			<div class="demo-piece demo-identity" style="--i: 1">
				<span class="demo-avatar">Y</span>
				<span class="demo-id-lines">
					<i class="demo-name"></i>
					<i class="demo-handle"></i>
				</span>
			</div>

			<div class="demo-piece demo-bio" style="--i: 2">
				<i></i>
				<i></i>
			</div>

			<div class="demo-piece demo-links" style="--i: 3">
				<span class="demo-chip demo-chip--pink">YouTube</span>
				<span class="demo-chip demo-chip--blue">Spotify</span>
				<span class="demo-chip demo-chip--lilac">Instagram</span>
			</div>

			<div class="demo-piece demo-grid" style="--i: 4">
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

			<div class="demo-piece demo-badge" style="--i: 5">
				<span aria-hidden="true">✦</span> verified vibes
			</div>
		</div>
	</div>

	<div class="demo-tags">
		{#each tags as tag, index (tag)}
			<span class="demo-tag" style={`--i: ${index + 1}`}>{tag}</span>
		{/each}
	</div>
</div>

<style>
	.demo {
		position: relative;
		display: grid;
		gap: 1rem;
		width: 100%;
	}

	.demo-frame {
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--color-foreground) 10%, transparent);
		border-radius: 1.75rem;
		background: linear-gradient(150deg, color-mix(in srgb, var(--color-surface) 86%, transparent), color-mix(in srgb, var(--color-background) 92%, transparent));
		box-shadow: 0 24px 60px rgb(0 0 0 / 18%);
		backdrop-filter: blur(14px);
	}

	.demo-bar {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		border-bottom: 1px solid var(--color-divider);
		padding: 0.6rem 0.9rem;
	}

	.demo-dots { display: inline-flex; gap: 0.3rem; }

	.demo-dots i {
		display: block;
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 50%;
		background: color-mix(in srgb, var(--color-muted) 45%, transparent);
	}

	.demo-url {
		min-width: 0;
		flex: 1;
		overflow: hidden;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 70%, transparent);
		padding: 0.22rem 0.6rem;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.62rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.demo-live {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.demo-page {
		position: relative;
		display: grid;
		gap: 0.85rem;
		padding: 0 1rem 1.1rem;
	}

	.demo-banner {
		position: relative;
		height: 4.2rem;
		margin: 0.85rem 0 0;
		overflow: hidden;
		border-radius: 1rem;
		background:
			radial-gradient(ellipse at 20% 10%, color-mix(in srgb, var(--color-pop-pink) 34%, transparent), transparent 62%),
			linear-gradient(120deg, color-mix(in srgb, var(--color-accent) 32%, var(--color-surface)), color-mix(in srgb, var(--color-pop-blue) 24%, var(--color-surface)));
	}

	.demo-banner-glow {
		position: absolute;
		inset: 0;
		background: linear-gradient(100deg, transparent 30%, rgb(255 255 255 / 16%) 48%, transparent 66%);
		animation: demo-sheen 6.5s ease-in-out infinite;
	}

	.demo-identity {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		margin-top: -1.6rem;
		padding-left: 0.35rem;
	}

	.demo-avatar {
		display: grid;
		width: 3.1rem;
		height: 3.1rem;
		flex: 0 0 auto;
		place-items: center;
		border: 2px solid var(--color-background);
		border-radius: 999px;
		background: linear-gradient(140deg, var(--color-accent), color-mix(in srgb, var(--color-pop-blue) 60%, var(--color-accent)));
		color: var(--color-on-accent);
		font-family: var(--font-display);
		font-size: 1.15rem;
		font-weight: 700;
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-accent) 40%, transparent);
	}

	.demo-id-lines { display: grid; flex: 1; gap: 0.35rem; min-width: 0; }

	.demo-name { display: block; width: 58%; height: 0.62rem; border-radius: 999px; background: color-mix(in srgb, var(--color-foreground) 72%, transparent); }
	.demo-handle { display: block; width: 36%; height: 0.42rem; border-radius: 999px; background: color-mix(in srgb, var(--color-muted) 50%, transparent); }

	.demo-bio { display: grid; gap: 0.32rem; padding-inline: 0.35rem; }

	.demo-bio i { display: block; height: 0.38rem; border-radius: 999px; background: color-mix(in srgb, var(--color-muted) 36%, transparent); }
	.demo-bio i:first-child { width: 92%; }
	.demo-bio i:last-child { width: 64%; }

	.demo-links { display: flex; flex-wrap: wrap; gap: 0.35rem; padding-inline: 0.35rem; }

	.demo-chip {
		border-radius: 999px;
		padding: 0.28rem 0.6rem;
		font-size: 0.6rem;
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	.demo-chip--pink { background: color-mix(in srgb, var(--color-pop-pink) 22%, transparent); color: var(--color-pop-pink); }
	.demo-chip--blue { background: color-mix(in srgb, var(--color-pop-blue) 24%, transparent); color: var(--color-pop-blue); }
	.demo-chip--lilac { background: var(--color-accent-soft); color: var(--color-accent); }

	.demo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; padding-inline: 0.35rem; }

	.demo-cell {
		display: grid;
		gap: 0.3rem;
		border: 1px solid var(--color-divider);
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--color-surface) 60%, transparent);
		padding: 0.55rem 0.6rem;
	}

	.demo-cell-head { display: block; width: 55%; height: 0.42rem; border-radius: 999px; background: color-mix(in srgb, var(--color-accent) 55%, transparent); }
	.demo-cell-line { display: block; height: 0.3rem; border-radius: 999px; background: color-mix(in srgb, var(--color-muted) 30%, transparent); }
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
		padding: 0.25rem 0.6rem;
		color: var(--color-pop-pink);
		font-size: 0.6rem;
		font-weight: 600;
	}

	.demo-tags { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem; }

	.demo-tag {
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 76%, transparent);
		padding: 0.28rem 0.65rem;
		color: var(--color-muted);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.demo-piece {
		animation: demo-assemble 12s cubic-bezier(0.2, 0.7, 0.2, 1) infinite both;
		animation-delay: calc(var(--i, 0) * 0.32s);
	}

	.demo-tag {
		animation: demo-assemble 12s cubic-bezier(0.2, 0.7, 0.2, 1) infinite both;
		animation-delay: calc(2.4s + var(--i, 0) * 0.22s);
	}

	@keyframes demo-assemble {
		0% { opacity: 0; transform: translate3d(0, 14px, 0) scale(0.94); }
		7% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
		88% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
		100% { opacity: 0; transform: translate3d(0, -6px, 0) scale(0.99); }
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
