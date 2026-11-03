<script lang="ts">
	import { cn } from '#lib/utils';

	type Rect = [number, number, number, number];
	type Layer = { fill: string; rects: Rect[] };

	let {
		size = 40,
		class: className = '',
		label = null
	}: { size?: number; class?: string; label?: string | null } = $props();

	const OUTLINE = '#241a12';
	const BODY = '#e3c89d';
	const BODY_SHADOW = '#bd9a6f';
	const EYE = '#231a12';
	const EYE_LIGHT = '#fff8e8';
	const SHELL = '#b7dd32';
	const SHELL_LIGHT = '#e8ff9c';
	const SHELL_DARK = '#6f8f1c';

	// Body first, so the shell sits over its back.
	const bodyLayers: Layer[] = [
		{
			fill: OUTLINE,
			rects: [
				[5, 11, 6, 1],
				[4, 12, 7, 1],
				[4, 13, 7, 1],
				[3, 14, 9, 1],
				[3, 15, 9, 1],
				[3, 16, 9, 1],
				[4, 17, 7, 1],
				[3, 17, 25, 1],
				[2, 18, 27, 1],
				[2, 19, 27, 1],
				[3, 20, 25, 1]
			]
		},
		{
			fill: OUTLINE,
			rects: [
				[3, 6, 3, 7],
				[8, 5, 3, 8]
			]
		},
		{
			fill: BODY,
			rects: [
				[4, 7, 1, 5],
				[9, 6, 1, 6]
			]
		},
		{
			fill: BODY,
			rects: [
				[6, 12, 5, 1],
				[5, 13, 6, 1],
				[4, 14, 8, 1],
				[4, 15, 8, 1],
				[4, 16, 8, 1],
				[5, 17, 6, 1],
				[4, 17, 23, 1],
				[3, 18, 25, 1],
				[3, 19, 25, 1]
			]
		},
		{
			fill: BODY_SHADOW,
			rects: [[4, 20, 23, 1]]
		},
		{
			fill: OUTLINE,
			rects: [
				[1, 4, 5, 4],
				[7, 3, 5, 4]
			]
		},
		{
			fill: EYE_LIGHT,
			rects: [
				[2, 5, 3, 2],
				[8, 4, 3, 2]
			]
		},
		{
			fill: EYE,
			rects: [
				[3, 6, 1, 1],
				[9, 5, 1, 1]
			]
		}
	];

	const shellLayers: Layer[] = [
		{
			fill: OUTLINE,
			rects: [
				[16, 4, 8, 1],
				[15, 5, 10, 1],
				[14, 6, 11, 1],
				[13, 7, 12, 1],
				[12, 8, 13, 1],
				[12, 9, 13, 1],
				[12, 10, 13, 1],
				[12, 11, 13, 1],
				[13, 12, 12, 1],
				[14, 13, 11, 1],
				[15, 14, 10, 1],
				[16, 15, 8, 1]
			]
		},
		{
			fill: SHELL,
			rects: [
				[17, 5, 6, 1],
				[15, 6, 9, 1],
				[14, 7, 10, 1],
				[13, 8, 11, 1],
				[13, 9, 11, 1],
				[13, 10, 11, 1],
				[13, 11, 11, 1],
				[14, 12, 10, 1],
				[15, 13, 9, 1],
				[16, 14, 8, 1]
			]
		},
		{
			fill: SHELL_LIGHT,
			rects: [
				[16, 5, 4, 1],
				[15, 6, 3, 1],
				[14, 7, 2, 1],
				[13, 8, 2, 1]
			]
		},
		{
			fill: SHELL_DARK,
			rects: [
				[19, 10, 5, 1],
				[19, 11, 5, 1],
				[18, 12, 5, 1],
				[17, 13, 5, 1]
			]
		},
		{
			fill: SHELL_DARK,
			rects: [
				[16, 7, 6, 1],
				[21, 7, 1, 5],
				[16, 11, 6, 1],
				[16, 8, 1, 3]
			]
		},
		{
			fill: SHELL_LIGHT,
			rects: [[17, 8, 4, 2]]
		},
		{
			fill: SHELL_DARK,
			rects: [[18, 9, 2, 1]]
		}
	];
</script>

<svg
	class={cn('pixel-snail', className)}
	width={size}
	height={(size * 24) / 32}
	viewBox="0 0 32 24"
	role={label ? 'img' : undefined}
	aria-label={label ?? undefined}
	aria-hidden={label ? undefined : 'true'}
	shape-rendering="crispEdges"
>
	<g class="snail-body">
		{#each bodyLayers as layer, index (index)}
			{#each layer.rects as rect (rect.join('-'))}
				<rect x={rect[0]} y={rect[1]} width={rect[2]} height={rect[3]} fill={layer.fill} />
			{/each}
		{/each}
	</g>
	<g class="snail-shell">
		{#each shellLayers as layer, index (index)}
			{#each layer.rects as rect (rect.join('-'))}
				<rect x={rect[0]} y={rect[1]} width={rect[2]} height={rect[3]} fill={layer.fill} />
			{/each}
		{/each}
	</g>
</svg>

<style>
	.pixel-snail {
		display: block;
		overflow: visible;
	}

	.snail-body {
		transform-box: view-box;
		transform-origin: 16px 21px;
		animation: snail-crawl 5.5s ease-in-out infinite;
	}

	.snail-shell {
		transform-box: view-box;
		transform-origin: 19px 10px;
		animation: snail-sway 5.5s ease-in-out infinite;
	}

	@keyframes snail-crawl {
		0%, 100% { transform: translateX(0) scaleY(1); }
		50% { transform: translateX(1px) scaleY(0.98); }
	}

	@keyframes snail-sway {
		0%, 100% { transform: rotate(-1.5deg); }
		50% { transform: rotate(1.5deg); }
	}

	@media (prefers-reduced-motion: reduce) {
		.snail-body,
		.snail-shell { animation: none; }
	}
</style>
