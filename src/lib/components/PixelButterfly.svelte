<script lang="ts">
	import { onMount } from 'svelte';

	type Cell = { x: number; y: number; w: number; h: number; fill: string };

	// A monarch at 24 x 20 pixels, so the wings carry veins, bands and spots.
	const K = '#1d1208';
	const D = '#c2581d';
	const O = '#ff8a3d';
	const L = '#ffb877';
	const C = '#ffe7b8';
	const W = '#fff9ea';
	const B = '#2c190d';
	const BM = '#4a2b17';

	const UPPER: Array<[number, number, number]> = [
		[4, 7, 10],
		[5, 6, 11],
		[6, 4, 11],
		[7, 2, 11],
		[8, 1, 11],
		[9, 1, 11],
		[10, 1, 11],
		[11, 2, 10],
		[12, 3, 9]
	];

	const LOWER: Array<[number, number, number]> = [
		[13, 4, 9],
		[14, 5, 9],
		[15, 6, 8],
		[16, 7, 8]
	];

	function wingBase(spans: Array<[number, number, number]>): Cell[] {
		const rects: Cell[] = [];
		for (const [y, x1, x2] of spans) {
			rects.push({ x: x1 - 1, y, w: x2 - x1 + 3, h: 1, fill: K });
		}
		for (const [y, x1, x2] of spans) {
			rects.push({ x: x1, y, w: x2 - x1 + 1, h: 1, fill: O });
		}
		return rects;
	}

	const WING_DETAIL: Cell[] = [
		// upper wing: veins, a darker band and pale flashes near the tips
		{ x: 6, y: 6, w: 1, h: 5, fill: K },
		{ x: 9, y: 7, w: 1, h: 4, fill: K },
		{ x: 2, y: 9, w: 1, h: 2, fill: K },
		{ x: 4, y: 10, w: 6, h: 1, fill: D },
		{ x: 5, y: 11, w: 5, h: 1, fill: D },
		{ x: 3, y: 8, w: 2, h: 1, fill: L },
		{ x: 6, y: 5, w: 2, h: 1, fill: L },
		{ x: 8, y: 6, w: 1, h: 1, fill: C },
		{ x: 4, y: 7, w: 1, h: 1, fill: C },
		{ x: 1, y: 8, w: 1, h: 1, fill: W },
		{ x: 1, y: 10, w: 1, h: 1, fill: W },
		{ x: 2, y: 11, w: 1, h: 1, fill: W },
		// lower wing
		{ x: 6, y: 13, w: 2, h: 1, fill: D },
		{ x: 5, y: 14, w: 4, h: 1, fill: D },
		{ x: 6, y: 13, w: 1, h: 2, fill: K },
		{ x: 7, y: 13, w: 1, h: 2, fill: K },
		{ x: 6, y: 14, w: 1, h: 1, fill: C },
		{ x: 6, y: 15, w: 1, h: 1, fill: W },
		{ x: 8, y: 15, w: 1, h: 1, fill: W }
	];

	const BODY: Cell[] = [
		{ x: 9, y: 1, w: 1, h: 1, fill: K },
		{ x: 10, y: 0, w: 1, h: 1, fill: K },
		{ x: 13, y: 0, w: 1, h: 1, fill: K },
		{ x: 14, y: 1, w: 1, h: 1, fill: K },
		{ x: 10, y: 2, w: 4, h: 1, fill: K },
		{ x: 10, y: 3, w: 4, h: 2, fill: B },
		{ x: 10, y: 3, w: 1, h: 1, fill: W },
		{ x: 13, y: 3, w: 1, h: 1, fill: W },
		{ x: 10, y: 5, w: 4, h: 1, fill: K },
		{ x: 11, y: 5, w: 2, h: 4, fill: K },
		{ x: 11, y: 5, w: 2, h: 3, fill: BM },
		{ x: 11, y: 8, w: 2, h: 8, fill: K },
		{ x: 11, y: 8, w: 2, h: 7, fill: B },
		{ x: 11, y: 10, w: 2, h: 1, fill: BM },
		{ x: 11, y: 12, w: 2, h: 1, fill: BM },
		{ x: 11, y: 14, w: 2, h: 1, fill: BM }
	];

	function mirror(rects: Cell[]): Cell[] {
		return rects.map((rect) => ({ ...rect, x: 23 - rect.x - rect.w + 1 }));
	}

	const LEFT_WING: Cell[] = [...wingBase(UPPER), ...wingBase(LOWER), ...WING_DETAIL];
	const RIGHT_WING: Cell[] = mirror(LEFT_WING);

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
				<svg viewBox="0 0 48 40" width="54" height="45" shape-rendering="crispEdges">
					<g class="wing wing-left">
						{#each LEFT_WING as cell, index (index)}
							<rect x={cell.x * 2} y={cell.y * 2} width={cell.w * 2} height={cell.h * 2} fill={cell.fill} />
						{/each}
					</g>
					<g class="wing wing-right">
						{#each RIGHT_WING as cell, index (index)}
							<rect x={cell.x * 2} y={cell.y * 2} width={cell.w * 2} height={cell.h * 2} fill={cell.fill} />
						{/each}
					</g>
					<g>
						{#each BODY as cell, index (index)}
							<rect x={cell.x * 2} y={cell.y * 2} width={cell.w * 2} height={cell.h * 2} fill={cell.fill} />
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
		transform-origin: 24px 20px;
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
