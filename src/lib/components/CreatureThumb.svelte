<script lang="ts">
	import { onMount } from 'svelte';
	import type { CreatureSetting } from '#lib/schemas/creatures';
	import {
		centerCreature,
		createCreature,
		drawCreature,
		setCreatureScale,
		uniformCreatureScale
	} from '#lib/creatures/engine';

	let {
		species,
		size = 36
	}: { species: CreatureSetting['id']; size?: number } = $props();

	// One shared preview box for every species, so the collection reads as a set.
	const PREVIEW_WIDTH = 76;
	const PREVIEW_HEIGHT = 52;

	let canvas = $state<HTMLCanvasElement | undefined>(undefined);

	onMount(() => {
		const surface = canvas;
		if (!surface) return;

		const context = surface.getContext('2d');
		if (!context) return;

		const ratio = Math.min(window.devicePixelRatio || 1, 2);
		surface.width = Math.round(PREVIEW_WIDTH * ratio);
		surface.height = Math.round(PREVIEW_HEIGHT * ratio);
		context.setTransform(ratio, 0, 0, ratio, 0, 0);
		context.imageSmoothingEnabled = false;
		context.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);

		const setting: CreatureSetting = { id: species, size: 1, enabled: true, intensity: 0.55, density: 0.6 };
		const creature = createCreature(setting, 0, 1, { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT });
		if (!creature) return;

		creature.heading = -0.28;
		creature.flap = Math.PI * 0.5;
		creature.state = 'gliding';
		creature.bobPhase = Math.PI;

		const scale = uniformCreatureScale(creature, size);
		setCreatureScale(creature, scale);
		centerCreature(creature, PREVIEW_WIDTH / 2, PREVIEW_HEIGHT / 2, scale);

		drawCreature(context, creature);
	});
</script>

<canvas bind:this={canvas} class="creature-thumb" aria-hidden="true"></canvas>

<style>
	.creature-thumb {
		display: block;
		width: 4.75rem;
		height: 3.25rem;
		flex: 0 0 auto;
	}
</style>
