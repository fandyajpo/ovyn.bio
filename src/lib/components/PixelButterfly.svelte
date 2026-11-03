<script lang="ts">
	import { onMount } from 'svelte';

	type Cell = { x: number; y: number; color: string };

	// A small monarch, drawn on a 16 x 13 pixel grid so the wings stay crisp.
	const MATRIX = [
		'.....k....k.....',
		'....k......k....',
		'...kkkk..kkkk...',
		'..koookbbkoook..',
		'.kowookbbkoowok.',
		'.kooookbbkooook.',
		'.kooookbbkooook.',
		'...kookbbkook...',
		'..kko..bb..okk..',
		'.kooo..bb..oook.',
		'.koo...bb...ook.',
		'..ko...bb...ok..',
		'..kk...bb...kk..'
	];

	const HIGHLIGHT = '#ffb877';
	const COLORS: Record<string, string> = {
		k: '#22150d',
		o: '#ff8a3d',
		l: HIGHLIGHT,
		w: '#ffe7b8',
		b: '#2d1c10'
	};

	const CELLS: Cell[] = MATRIX.flatMap((row, y) =>
		[...row].map((cell, x) => ({ x, y, cell }))
	)
		.filter((pixel) => COLORS[pixel.cell] !== undefined)
		.map((pixel) => ({
			x: pixel.x,
			y: pixel.y,
			color:
				pixel.cell === 'o' && (pixel.x + pixel.y) % 7 === 0
					? HIGHLIGHT
					: (COLORS[pixel.cell] ?? HIGHLIGHT)
		}));

	const LEFT_WING = CELLS.filter((cell) => cell.x < 7);
	const RIGHT_WING = CELLS.filter((cell) => cell.x > 8);
	const BODY = CELLS.filter((cell) => cell.x >= 7 && cell.x <= 8);

	let host = $state<HTMLDivElement | undefined>(undefined);
	let ready = $state(false);
	let still = $state(false);
	let x = $state(0);
	let y = $state(0);
	let tilt = $state(0);
	let flip = $state(false);
	let duration = $state(0);

	onMount(() => {
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		const start = pick(null);
		x = start.x;
		y = start.y;
		ready = true;
		still = media.matches;

		const observer = new ResizeObserver(() => {
			const bounds = host?.getBoundingClientRect();
			if (!bounds) return;
			x = clamp(x, 44, Math.max(44, bounds.width - 44));
			y = clamp(y, 44, Math.max(44, bounds.height - 44));
		});
		if (host) observer.observe(host);

		if (media.matches) {
			return () => observer.disconnect();
		}

		let timer: ReturnType<typeof setTimeout> | undefined;
		let currentX = x;
		let currentY = y;

		const fly = () => {
			const target = pick({ x: currentX, y: currentY });
			const dx = target.x - currentX;
			const dy = target.y - currentY;
			duration = Math.round(2200 + Math.min(3400, Math.hypot(dx, dy) * 6) + Math.random() * 900);
			tilt = clamp(dx * 0.08, -16, 16);
			flip = dx < 0;
			x = target.x;
			y = target.y;
			currentX = target.x;
			currentY = target.y;
			timer = setTimeout(fly, duration + 700 + Math.random() * 1500);
		};

		timer = setTimeout(fly, 900);

		return () => {
			observer.disconnect();
			if (timer) clearTimeout(timer);
		};
	});

	function pick(previous: { x: number; y: number } | null) {
		const bounds = host?.getBoundingClientRect();
		const width = bounds?.width ?? 320;
		const height = bounds?.height ?? 420;
		const min = 44;
		const maxX = Math.max(min, width - min);
		const maxY = Math.max(min, height - min);
		let next = { x: min, y: min };

		for (let attempt = 0; attempt < 8; attempt += 1) {
			next = { x: min + Math.random() * (maxX - min), y: min + Math.random() * (maxY - min) };
			if (!previous) break;
			if (Math.hypot(next.x - previous.x, next.y - previous.y) > Math.min(180, Math.max(90, width * 0.3))) break;
		}

		return next;
	}

	function clamp(value: number, min: number, max: number) {
		return Math.min(Math.max(value, min), max);
	}
</script>

<div
	bind:this={host}
	class="butterfly-host"
	class:is-still={still}
	aria-hidden="true"
>
	{#if ready}
		<div
			class="butterfly"
			style={`--x: ${x}px; --y: ${y}px; --tilt: ${tilt}deg; --flip: ${flip ? -1 : 1}; --fly: ${duration}ms`}
		>
			<span class="bob">
				<svg viewBox="0 0 32 26" width="42" height="34" shape-rendering="crispEdges">
					<g class="wing wing-left">
						{#each LEFT_WING as cell (cell.y * 16 + cell.x)}
							<rect x={cell.x * 2} y={cell.y * 2} width="2" height="2" fill={cell.color} />
						{/each}
					</g>
					<g class="wing wing-right">
						{#each RIGHT_WING as cell (cell.y * 16 + cell.x)}
							<rect x={cell.x * 2} y={cell.y * 2} width="2" height="2" fill={cell.color} />
						{/each}
					</g>
					<g>
						{#each BODY as cell (cell.y * 16 + cell.x)}
							<rect x={cell.x * 2} y={cell.y * 2} width="2" height="2" fill={cell.color} />
						{/each}
					</g>
				</svg>
			</span>
		</div>
	{/if}
</div>

<style>
	.butterfly-host {
		position: absolute;
		z-index: 0;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.butterfly {
		position: absolute;
		top: 0;
		left: 0;
		will-change: transform;
		transform: translate(-50%, -50%) translate(var(--x), var(--y)) rotate(var(--tilt)) scaleX(var(--flip));
		transition: transform var(--fly) cubic-bezier(0.45, 0.05, 0.55, 0.95);
	}

	.bob {
		display: block;
		animation: butterfly-bob 2.6s ease-in-out infinite;
	}

	.wing {
		transform-box: view-box;
		transform-origin: 16px 13px;
		animation: wing-flap 300ms steps(2, end) infinite alternate;
	}

	.is-still .butterfly { transition: none; }
	.is-still .bob,
	.is-still .wing { animation: none; }

	@keyframes wing-flap {
		from { transform: scaleX(1); }
		to { transform: scaleX(0.45); }
	}

	@keyframes butterfly-bob {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-4px); }
	}

	@media (prefers-reduced-motion: reduce) {
		.butterfly { transition: none; }
		.bob,
		.wing { animation: none; }
	}
</style>
