<script lang="ts">
	import { onMount } from 'svelte';

	/*
	 * A sparse field of softly glowing square pixels behind the landing hero,
	 * after the mockup: densest toward the edges, fading to nothing around the
	 * headline copy so the glow never sits behind the text. Drawn on one canvas
	 * with a slow brightness pulse; static under reduced motion.
	 */
	let host = $state<HTMLDivElement | undefined>(undefined);
	let canvas = $state<HTMLCanvasElement | undefined>(undefined);

	/* Dark mode keeps the mockup's lavender family; light mode follows the
	   blue and orange palette, so the field never fights the theme. */
	const DARK_COLORS = ['#c4b5fd', '#fbcfe8', '#a5b4fc'] as const;
	const LIGHT_COLORS = ['#8fb5fa', '#f2b28a', '#6d89f5'] as const;

	const themeColors = () =>
		typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light'
			? LIGHT_COLORS
			: DARK_COLORS;

	type Pixel = {
		x: number;
		y: number;
		size: number;
		color: string;
		alpha: number;
		period: number;
		phase: number;
	};

	onMount(() => {
		const box = host;
		const el = canvas;
		if (!box || !el) return;
		const context = el.getContext('2d');
		if (!context) return;

		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		let pixels: Pixel[] = [];
		let width = 0;
		let height = 0;
		let frame = 0;
		let lastDraw = 0;
		let inView = true;
		let colors = themeColors();

		const seedPixel = (): Pixel => ({
			x: Math.random() * width,
			y: Math.random() * height,
			size: Math.random() > 0.86 ? 9 : 6,
			color: colors[Math.floor(Math.random() * colors.length)] ?? colors[0],
			alpha: 0.12 + Math.random() * 0.52,
			period: 2600 + Math.random() * 3800,
			phase: Math.random() * Math.PI * 2
		});

		const build = () => {
			const rect = box.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) return;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			width = rect.width;
			height = rect.height;
			el.width = Math.round(width * dpr);
			el.height = Math.round(height * dpr);
			context.setTransform(dpr, 0, 0, dpr, 0, 0);

			// The copy column dims the field around itself, so pixels never sit
			// behind the headline no matter where the hero breaks.
			const copy = box.parentElement?.querySelector('.landing-hero-copy');
			const hostRect = box.getBoundingClientRect();
			const copyRect = copy?.getBoundingClientRect() ?? null;
			const center = copyRect
				? {
						x: copyRect.left - hostRect.left + copyRect.width / 2,
						y: copyRect.top - hostRect.top + copyRect.height / 2,
						radius: Math.max(copyRect.width, copyRect.height) * 0.55
					}
				: null;

			const count = Math.min(220, Math.round((width * height) / 9000));
			pixels = [];
			for (let i = 0; i < count; i += 1) {
				const pixel = seedPixel();
				if (center) {
					const distance = Math.hypot(pixel.x - center.x, pixel.y - center.y);
					const fade = Math.min(1, Math.max(0, (distance - center.radius) / (center.radius * 0.9)));
					if (fade < 0.05) continue;
					pixel.alpha *= 0.25 + 0.75 * fade;
				}
				pixels.push(pixel);
			}

			// One frame is enough when the field never animates.
			if (reduceMotion) draw(0);
		};

		const draw = (time: number) => {
			context.clearRect(0, 0, width, height);
			for (const pixel of pixels) {
				const pulse = reduceMotion ? 0.75 : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((time / pixel.period) * Math.PI * 2 + pixel.phase));
				context.globalAlpha = pixel.alpha * pulse;
				context.fillStyle = pixel.color;
				context.shadowColor = pixel.color;
				context.shadowBlur = pixel.size > 6 ? 14 : 7;
				context.fillRect(pixel.x, pixel.y, pixel.size, pixel.size);
			}
			context.globalAlpha = 1;
			context.shadowBlur = 0;
		};

		const tick = (time: number) => {
			frame = requestAnimationFrame(tick);
			// Around 30fps is plenty for a slow glow; keeps the tab cheap.
			if (time - lastDraw < 32) return;
			lastDraw = time;
			if (document.hidden || !inView) return;
			draw(time);
		};

		const resizeObserver = new ResizeObserver(() => build());
		resizeObserver.observe(box);
		build();

		// The palette follows the theme toggle without a reload.
		const themeObserver = new MutationObserver(() => {
			const next = themeColors();
			if (next === colors) return;
			colors = next;
			build();
		});
		themeObserver.observe(document.documentElement, { attributeFilter: ['data-theme'] });

		if (!reduceMotion) {
			frame = requestAnimationFrame(tick);
			const onVisibility = () => {
				if (!document.hidden) lastDraw = 0;
			};
			const intersection = new IntersectionObserver((entries) => {
				inView = entries[0]?.isIntersecting ?? true;
			});
			intersection.observe(box);
			document.addEventListener('visibilitychange', onVisibility);
			return () => {
				cancelAnimationFrame(frame);
				resizeObserver.disconnect();
				intersection.disconnect();
				themeObserver.disconnect();
				document.removeEventListener('visibilitychange', onVisibility);
			};
		}

		return () => {
			resizeObserver.disconnect();
			themeObserver.disconnect();
		};
	});
</script>

<div class="pixel-field-host" bind:this={host} aria-hidden="true">
	<canvas class="pixel-field-canvas" bind:this={canvas}></canvas>
</div>

<style>
	.pixel-field-host {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.pixel-field-canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>