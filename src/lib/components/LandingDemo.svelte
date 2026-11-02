<script lang="ts">
	const tags = ['personal brand', 'circle', 'flex', 'expression'];
</script>

<div
	class="demo"
	role="img"
	aria-label="A three dimensional preview of an ovyn page assembling itself in layers: the page slides in, then a links panel, a content grid and a badge dock onto it from the sides at different depths, then the words personal brand, circle, flex and expression appear."
>
	<div class="demo-stage">
		<div class="demo-scene">
			<article class="demo-layer demo-board" style="--i: 0; --to: translate3d(0, 0, 0) rotateY(0deg); --from: translate3d(-135%, 18px, -180px) rotateY(-26deg);">
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

			<aside
				class="demo-layer demo-float demo-float--links"
				style="--i: 1; --to: translate3d(0, 0, 70px) rotateY(-7deg); --from: translate3d(155%, -16px, 40px) rotateY(22deg);"
			>
				<span class="demo-float-title">links</span>
				<div class="demo-links">
					<span class="demo-chip demo-chip--pink">YouTube</span>
					<span class="demo-chip demo-chip--blue">Spotify</span>
					<span class="demo-chip demo-chip--lilac">Instagram</span>
				</div>
			</aside>

			<div class="demo-layer demo-float demo-float--grid" style="--i: 2; --to: translate3d(0, 0, -90px) rotateY(9deg); --from: translate3d(-150%, 26px, -220px) rotateY(24deg);">
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

			<div class="demo-layer demo-float demo-float--badge" style="--i: 3; --to: translate3d(0, 0, 130px) rotateY(-4deg); --from: translate3d(150%, 14px, 90px) rotateY(26deg);">
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
		position: relative;
		display: grid;
		gap: 1.1rem;
		width: 100%;
	}

	.demo-stage {
		position: relative;
		padding: 1.35rem 0 1.9rem;
		perspective: 1150px;
		perspective-origin: 58% 42%;
	}

	.demo-scene {
		position: relative;
		transform-style: preserve-3d;
		transform: rotateX(9deg) rotateY(-15deg) rotateZ(1.4deg);
	}

	/* Every layer slides in from its own side, at its own depth. */
	.demo-layer {
		animation: demo-layer-dock 13s cubic-bezier(0.22, 0.68, 0.24, 1) infinite both;
		animation-delay: calc(var(--i, 0) * 0.5s);
		transform: var(--to);
		transform-style: preserve-3d;
		will-change: transform, opacity;
	}

	.demo-board {
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--color-foreground) 11%, transparent);
		border-radius: 1.6rem;
		background: linear-gradient(150deg, color-mix(in srgb, var(--color-surface) 90%, transparent), color-mix(in srgb, var(--color-background) 94%, transparent));
		box-shadow:
			0 36px 70px rgb(0 0 0 / 26%),
			0 2px 0 color-mix(in srgb, var(--color-foreground) 8%, transparent) inset;
		backdrop-filter: blur(12px);
	}

	.demo-bar {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		border-bottom: 1px solid var(--color-divider);
		padding: 0.55rem 0.85rem;
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
		gap: 0.8rem;
		padding: 0 0.9rem 1rem;
	}

	.demo-banner {
		position: relative;
		height: 4.4rem;
		margin-top: 0.8rem;
		overflow: hidden;
		border-radius: 0.95rem;
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
		margin-top: -1.55rem;
		padding-left: 0.3rem;
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

	.demo-name { display: block; width: 58%; height: 0.6rem; border-radius: 999px; background: color-mix(in srgb, var(--color-foreground) 72%, transparent); }
	.demo-handle { display: block; width: 36%; height: 0.4rem; border-radius: 999px; background: color-mix(in srgb, var(--color-muted) 50%, transparent); }

	.demo-bio { display: grid; gap: 0.3rem; padding-inline: 0.3rem; }

	.demo-bio i { display: block; height: 0.36rem; border-radius: 999px; background: color-mix(in srgb, var(--color-muted) 36%, transparent); }
	.demo-bio i:first-child { width: 92%; }
	.demo-bio i:last-child { width: 64%; }

	/* Docked layers: cards that sit on the board at different depths. */
	.demo-float {
		position: absolute;
		border: 1px solid var(--color-divider);
		border-radius: 1.1rem;
		background: color-mix(in srgb, var(--color-surface) 92%, transparent);
		padding: 0.6rem 0.7rem;
		box-shadow: 0 20px 44px rgb(0 0 0 / 22%);
		backdrop-filter: blur(10px);
	}

	.demo-float--links {
		top: 14%;
		left: 60%;
		width: 40%;
	}

	.demo-float--grid {
		top: 56%;
		left: -9%;
		width: 45%;
	}

	.demo-float--badge {
		top: 88%;
		left: 56%;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		width: fit-content;
		border-color: color-mix(in srgb, var(--color-pop-pink) 34%, transparent);
		background: color-mix(in srgb, var(--color-pop-pink) 14%, var(--color-surface));
		padding: 0.32rem 0.7rem;
		color: var(--color-pop-pink);
		font-size: 0.62rem;
		font-weight: 600;
	}

	.demo-float-title {
		display: block;
		margin-bottom: 0.4rem;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.55rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.demo-links { display: flex; flex-wrap: wrap; gap: 0.3rem; }

	.demo-chip {
		border-radius: 999px;
		padding: 0.26rem 0.55rem;
		font-size: 0.58rem;
		font-weight: 600;
		letter-spacing: 0.03em;
	}

	.demo-chip--pink { background: color-mix(in srgb, var(--color-pop-pink) 22%, transparent); color: var(--color-pop-pink); }
	.demo-chip--blue { background: color-mix(in srgb, var(--color-pop-blue) 24%, transparent); color: var(--color-pop-blue); }
	.demo-chip--lilac { background: var(--color-accent-soft); color: var(--color-accent); }

	.demo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }

	.demo-cell {
		display: grid;
		gap: 0.28rem;
		border: 1px solid var(--color-divider);
		border-radius: 0.65rem;
		background: color-mix(in srgb, var(--color-background) 60%, transparent);
		padding: 0.45rem 0.5rem;
	}

	.demo-cell-head { display: block; width: 55%; height: 0.38rem; border-radius: 999px; background: color-mix(in srgb, var(--color-accent) 55%, transparent); }
	.demo-cell-line { display: block; height: 0.28rem; border-radius: 999px; background: color-mix(in srgb, var(--color-muted) 30%, transparent); }
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
		.demo-stage { perspective: 900px; padding-block: 1rem 1.5rem; }
		.demo-scene { transform: rotateX(7deg) rotateY(-10deg); }
		.demo-float--links { left: 52%; width: 47%; }
		.demo-float--grid { left: -4%; width: 50%; }
		.demo-float--badge { left: 46%; top: 90%; }
	}

	@media (max-width: 30rem) {
		.demo-float--grid { top: 60%; left: -2%; width: 56%; }
		.demo-float--links { left: 46%; width: 52%; }
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
