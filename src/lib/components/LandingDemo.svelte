<script lang="ts">
	const tags = ['personal brand', 'circle', 'flex', 'expression'];
</script>

<div
	class="demo"
	role="img"
	aria-label="A three dimensional preview of an ovyn page assembling itself in layers: the page slides in from the left, a links panel docks on its right, a content grid tucks behind it and a badge lands on the front corner, then the words personal brand, circle, flex and expression appear."
>
	<div class="demo-stage">
		<div class="demo-scene">
			<article class="demo-layer demo-board" style="--i: 0; --to: translate3d(0, 0, 0) rotateY(0deg); --from: translate3d(-120%, 16px, -160px) rotateY(-22deg);">
				<div class="demo-bar">
					<span class="demo-dots" aria-hidden="true"><i></i><i></i><i></i></span>
					<span class="demo-url">ovyn.bio/your-name</span>
					<span class="demo-live"><span class="status-dot"></span>live</span>
				</div>

				<div class="demo-page">
					<div class="demo-banner">
						<span class="demo-banner-glow" aria-hidden="true"></span>
					</div>

					<div class="demo-identity">
						<span class="demo-avatar">Y</span>
						<span class="demo-id-lines">
							<i class="demo-name"></i>
							<i class="demo-handle"></i>
						</span>
					</div>

					<div class="demo-bio">
						<i></i>
						<i></i>
					</div>
				</div>
			</article>

			<aside class="demo-layer demo-float demo-float--links" style="--i: 1; --to: translate3d(0, 0, 60px) rotateY(-6deg); --from: translate3d(140%, -10px, 30px) rotateY(20deg);">
				<span class="demo-float-title">links</span>
				<div class="demo-links">
					<span class="demo-chip demo-chip--pink">YouTube</span>
					<span class="demo-chip demo-chip--blue">Spotify</span>
					<span class="demo-chip demo-chip--lilac">Instagram</span>
				</div>
			</aside>

			<div class="demo-layer demo-float demo-float--grid" style="--i: 2; --to: translate3d(0, 0, -70px) rotateY(8deg); --from: translate3d(-130%, 22px, -200px) rotateY(22deg);">
				<span class="demo-float-title">grid</span>
				<div class="demo-grid">
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
			</div>

			<div class="demo-layer demo-float demo-float--badge" style="--i: 3; --to: translate3d(0, 0, 110px) rotateY(-4deg); --from: translate3d(140%, 12px, 70px) rotateY(24deg);">
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
		gap: 1.1rem;
		width: 100%;
	}

	.demo-stage {
		position: relative;
		padding: 1.75rem 1.5rem;
		perspective: 1400px;
		perspective-origin: 50% 45%;
	}

	.demo-scene {
		position: relative;
		transform-style: preserve-3d;
		transform: rotateX(6deg) rotateY(-11deg);
	}

	/* Board sits in the flow and defines the height of the scene. */
	.demo-board {
		position: relative;
		z-index: 20;
		width: 88%;
		margin-inline: auto;
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--color-foreground) 11%, transparent);
		border-radius: 1.5rem;
		background: linear-gradient(150deg, color-mix(in srgb, var(--color-surface) 92%, transparent), color-mix(in srgb, var(--color-background) 94%, transparent));
		box-shadow:
			0 34px 64px rgb(0 0 0 / 24%),
			inset 0 1px 0 color-mix(in srgb, var(--color-foreground) 7%, transparent);
	}

	/* Docked panels. Depth (translateZ) and z-index together keep the order. */
	.demo-float {
		position: absolute;
		border: 1px solid var(--color-divider);
		border-radius: 1rem;
		background: color-mix(in srgb, var(--color-surface) 94%, transparent);
		padding: 0.6rem 0.7rem;
		box-shadow: 0 18px 38px rgb(0 0 0 / 26%);
		pointer-events: none;
	}

	.demo-float--links {
		z-index: 40;
		top: 2%;
		right: -2%;
		width: 40%;
	}

	.demo-float--grid {
		z-index: 10;
		bottom: 5%;
		left: -2%;
		width: 42%;
	}

	.demo-float--badge {
		z-index: 60;
		right: 6%;
		bottom: -2%;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		width: fit-content;
		border-color: color-mix(in srgb, var(--color-pop-pink) 36%, transparent);
		background: color-mix(in srgb, var(--color-pop-pink) 16%, var(--color-surface));
		padding: 0.32rem 0.7rem;
		color: var(--color-pop-pink);
		font-size: 0.62rem;
		font-weight: 600;
	}

	.demo-bar {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		border-bottom: 1px solid var(--color-divider);
		padding: 0.5rem 0.75rem;
	}

	.demo-dots { display: inline-flex; gap: 0.28rem; }

	.demo-dots i {
		display: block;
		width: 0.38rem;
		height: 0.38rem;
		border-radius: 50%;
		background: color-mix(in srgb, var(--color-muted) 45%, transparent);
	}

	.demo-url {
		min-width: 0;
		flex: 1;
		overflow: hidden;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 70%, transparent);
		padding: 0.18rem 0.5rem;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.56rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.demo-live {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.52rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.demo-page {
		display: grid;
		gap: 0.7rem;
		padding: 0 0.75rem 0.9rem;
	}

	.demo-banner {
		position: relative;
		height: 3.6rem;
		margin-top: 0.7rem;
		overflow: hidden;
		border-radius: 0.85rem;
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
		gap: 0.55rem;
		margin-top: -1.35rem;
		padding-left: 0.25rem;
	}

	.demo-avatar {
		display: grid;
		width: 2.6rem;
		height: 2.6rem;
		flex: 0 0 auto;
		place-items: center;
		border: 2px solid var(--color-background);
		border-radius: 999px;
		background: linear-gradient(140deg, var(--color-accent), color-mix(in srgb, var(--color-pop-blue) 60%, var(--color-accent)));
		color: var(--color-on-accent);
		font-family: var(--font-display);
		font-size: 0.95rem;
		font-weight: 700;
	}

	.demo-id-lines { display: grid; flex: 1; gap: 0.28rem; min-width: 0; }

	.demo-name { display: block; width: 52%; height: 0.52rem; border-radius: 999px; background: color-mix(in srgb, var(--color-foreground) 72%, transparent); }
	.demo-handle { display: block; width: 32%; height: 0.36rem; border-radius: 999px; background: color-mix(in srgb, var(--color-muted) 50%, transparent); }

	.demo-bio { display: grid; gap: 0.28rem; padding-inline: 0.25rem; }

	.demo-bio i { display: block; height: 0.32rem; border-radius: 999px; background: color-mix(in srgb, var(--color-muted) 34%, transparent); }
	.demo-bio i:first-child { width: 86%; }
	.demo-bio i:last-child { width: 58%; }

	.demo-float-title {
		display: block;
		margin-bottom: 0.35rem;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.52rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.demo-links { display: flex; flex-wrap: wrap; gap: 0.25rem; }

	.demo-chip {
		border-radius: 999px;
		padding: 0.24rem 0.5rem;
		font-size: 0.56rem;
		font-weight: 600;
		letter-spacing: 0.02em;
	}

	.demo-chip--pink { background: color-mix(in srgb, var(--color-pop-pink) 22%, transparent); color: var(--color-pop-pink); }
	.demo-chip--blue { background: color-mix(in srgb, var(--color-pop-blue) 24%, transparent); color: var(--color-pop-blue); }
	.demo-chip--lilac { background: var(--color-accent-soft); color: var(--color-accent); }

	.demo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem; }

	.demo-cell {
		display: grid;
		gap: 0.24rem;
		border: 1px solid var(--color-divider);
		border-radius: 0.6rem;
		background: color-mix(in srgb, var(--color-background) 60%, transparent);
		padding: 0.4rem 0.45rem;
	}

	.demo-cell-head { display: block; width: 55%; height: 0.34rem; border-radius: 999px; background: color-mix(in srgb, var(--color-accent) 55%, transparent); }
	.demo-cell-line { display: block; height: 0.26rem; border-radius: 999px; background: color-mix(in srgb, var(--color-muted) 30%, transparent); }
	.demo-cell-line--short { width: 70%; }

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
		animation: demo-tag-in 13s cubic-bezier(0.22, 0.68, 0.24, 1) infinite both;
		animation-delay: calc(2.2s + var(--i, 0) * 0.18s);
	}

	.demo-layer {
		animation: demo-layer-dock 13s cubic-bezier(0.22, 0.68, 0.24, 1) infinite both;
		animation-delay: calc(var(--i, 0) * 0.5s);
		transform: var(--to);
		transform-style: preserve-3d;
		will-change: transform, opacity;
	}

	@keyframes demo-layer-dock {
		0% { opacity: 0; transform: var(--from); }
		9% { opacity: 1; transform: var(--to); }
		90% { opacity: 1; transform: var(--to); }
		100% { opacity: 0; transform: var(--to); }
	}

	@keyframes demo-tag-in {
		0% { opacity: 0; transform: translate3d(0, 10px, 0); }
		8% { opacity: 1; transform: translate3d(0, 0, 0); }
		90% { opacity: 1; transform: translate3d(0, 0, 0); }
		100% { opacity: 0; transform: translate3d(0, 0, 0); }
	}

	@keyframes demo-sheen {
		0%, 100% { transform: translateX(-60%); }
		55% { transform: translateX(60%); }
	}

	@media (max-width: 48rem) {
		.demo-stage { padding: 1.25rem 1rem; perspective: 1000px; }
		.demo-scene { transform: rotateX(5deg) rotateY(-8deg); }
		.demo-board { width: 100%; }
		.demo-float--links { top: 1%; right: -1%; width: 48%; }
		.demo-float--grid { bottom: 4%; left: -1%; width: 50%; }
		.demo-float--badge { right: 3%; bottom: -1%; }
	}

	@media (prefers-reduced-motion: reduce) {
		.demo-layer,
		.demo-tag,
		.demo-banner-glow {
			animation: none;
			opacity: 1;
			transform: var(--to, none);
		}
	}
</style>
