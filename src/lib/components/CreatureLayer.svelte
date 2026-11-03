<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { CreatureSetting } from '#lib/schemas/creatures';
	import {
		centerCreature,
		createCreature,
		drawCreature,
		setCreatureScale,
		uniformCreatureScale,
		updateCreature,
		type Bounds,
		type Creature
	} from '#lib/creatures/engine';

	let {
		settings = [],
		preview = false,
		class: className = ''
	}: { settings?: CreatureSetting[]; preview?: boolean; class?: string } = $props();

	let host = $state<HTMLDivElement | undefined>(undefined);
	let canvas = $state<HTMLCanvasElement | undefined>(undefined);
	let ready = $state(false);
	let apply: (list: CreatureSetting[]) => void = () => {};

	// Settings arrive as ordinary props; only a real change (a new array) rebuilds
	// the flock, never an animation frame.
	$effect(() => {
		const list = settings;
		if (!ready) return;
		untrack(() => apply(list));
	});

	onMount(() => {
		const stage = host;
		const surface = canvas;
		if (!stage || !surface) return;

		const context = surface.getContext('2d');
		if (!context) return;

		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		let reduced = media.matches;
		let width = 0;
		let height = 0;
		let bounds: Bounds = { width: 320, height: 240 };
		let margin = 48;
		let creatures: Creature[] = [];
		let currentList: CreatureSetting[] = [];
		let frame = 0;
		let paintClock = 0;
		let running = false;
		let visible = false;
		let last = 0;

		const capacity = () => {
			const shortest = Math.min(bounds.width, bounds.height);
			const cores = navigator.hardwareConcurrency ?? 4;
			if (shortest < 260) return 2;
			if (cores <= 4) return 3;
			return preview ? 4 : 6;
		};

		const build = (list: CreatureSetting[]) => {
			currentList = list;
			const active = list.filter((item) => item.enabled).slice(0, capacity());
			const next: Creature[] = [];
			const columns = Math.min(2, Math.max(1, active.length));
			const rows = Math.ceil(active.length / columns);

			for (let index = 0; index < active.length; index += 1) {
				const setting = active[index];
				if (!setting) continue;
				const creature = createCreature(setting, index, active.length, bounds);
				if (!creature) continue;

				if (preview) {
					// Preview creatures sit as one tidy flock around the centre, each
					// on its own small anchor, all drawn at the same apparent size.
					const column = index % columns;
					const row = Math.floor(index / columns);
					const anchorX = width / 2 + (column - (columns - 1) / 2) * 58;
					const anchorY = height / 2 + (row - (rows - 1) / 2) * 48;
					const scale = uniformCreatureScale(creature, 26 * Math.min(1.25, Math.max(0.8, setting.size)));
					setCreatureScale(creature, scale);
					centerCreature(creature, anchorX, anchorY, scale);
					creature.home = { x: anchorX, y: anchorY, radius: 9 };
					creature.cruise *= 0.4;
					creature.heading = Math.random() * Math.PI * 2;
					creature.headingTarget = creature.heading;
				} else {
					creature.fit = Math.min(1.15, Math.max(0.72, Math.min(bounds.width, bounds.height) / 900));
				}

				next.push(creature);
			}
			creatures = next;
			margin = Math.round(46 + 40 * Math.min(1.4, Math.min(bounds.width, bounds.height) / 900));
			paint();
		};

		const paint = () => {
			context.clearRect(0, 0, width, height);
			for (const creature of creatures) drawCreature(context, creature);
		};

		const resize = () => {
			const rect = stage.getBoundingClientRect();
			width = Math.max(1, Math.round(rect.width));
			height = Math.max(1, Math.round(rect.height));
			bounds = { width, height };
			const ratio = Math.min(window.devicePixelRatio || 1, 2);
			surface.width = Math.round(width * ratio);
			surface.height = Math.round(height * ratio);
			surface.style.width = `${width}px`;
			surface.style.height = `${height}px`;
			context.setTransform(ratio, 0, 0, ratio, 0, 0);
			context.imageSmoothingEnabled = false;
		};

		const loop = (time: number) => {
			if (!running) return;
			const delta = last ? Math.min(0.05, (time - last) / 1000) : 0.016;
			last = time;

			for (const creature of creatures) updateCreature(creature, delta, bounds, margin);

			// A whole page of sprites does not need 60fps.
			paintClock += delta;
			if (paintClock >= 1 / 40) {
				paintClock = 0;
				paint();
			}

			frame = requestAnimationFrame(loop);
		};

		const start = () => {
			if (running || reduced || !visible || document.hidden) return;
			running = true;
			last = 0;
			frame = requestAnimationFrame(loop);
		};

		const stop = () => {
			running = false;
			if (frame) cancelAnimationFrame(frame);
			frame = 0;
		};

		resize();

		apply = (list: CreatureSetting[]) => {
			build(list);
			if (!reduced) start();
		};

		if (creatures.length === 0) paint();
		ready = true;

		const observer = new ResizeObserver(() => {
			resize();
			if (preview) {
				// Anchors depend on the box, so the flock is laid out again.
				build(currentList);
				return;
			}
			for (const creature of creatures) {
				creature.fit = Math.min(1.15, Math.max(0.72, Math.min(width, height) / 900));
			}
			paint();
		});
		observer.observe(stage);

		const intersection = new IntersectionObserver(
			(entries) => {
				visible = entries.some((entry) => entry.isIntersecting);
				if (visible) start();
				else stop();
			},
			{ threshold: 0.02 }
		);
		intersection.observe(stage);

		const onVisibility = () => {
			if (document.hidden) stop();
			else start();
		};
		document.addEventListener('visibilitychange', onVisibility);

		const onMotionPreference = () => {
			reduced = media.matches;
			if (reduced) {
				stop();
				paint();
			} else {
				start();
			}
		};
		media.addEventListener?.('change', onMotionPreference);

		return () => {
			stop();
			ready = false;
			observer.disconnect();
			intersection.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			media.removeEventListener?.('change', onMotionPreference);
		};
	});
</script>

<div bind:this={host} class="creature-layer {className}" aria-hidden="true">
	<canvas bind:this={canvas} class="creature-canvas"></canvas>
</div>

<style>
	.creature-layer {
		position: absolute;
		z-index: 0;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.creature-canvas {
		display: block;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
</style>
