<script lang="ts">
	import { onMount } from 'svelte';
	import type { CreatureSetting } from '#lib/schemas/creatures';
	import { createThumbCreature, drawCreature } from '#lib/creatures/engine';

	let {
		species,
		size = 0.6
	}: { species: CreatureSetting['id']; size?: number } = $props();

	let canvas = $state<HTMLCanvasElement | undefined>(undefined);

	onMount(() => {
		const surface = canvas;
		if (!surface) return;

		const context = surface.getContext('2d');
		if (!context) return;

		const ratio = Math.min(window.devicePixelRatio || 1, 2);
		const width = 120;
		const height = 84;
		surface.width = Math.round(width * ratio);
		surface.height = Math.round(height * ratio);
		surface.style.width = `${width / 2}rem`;
		surface.style.height = `${height / 2}rem`;
		context.setTransform(ratio, 0, 0, ratio, 0, 0);
		context.imageSmoothingEnabled = false;
		context.clearRect(0, 0, width, height);

		const creature = createThumbCreature({ id: species, enabled: true, size, intensity: 0.55, density: 0.6 });
		if (creature) drawCreature(context, creature);
	});
</script>

<canvas bind:this={canvas} class="creature-thumb" aria-hidden="true"></canvas>

<style>
	.creature-thumb {
		display: block;
		width: 3.75rem;
		height: 2.625rem;
	}
</style>
