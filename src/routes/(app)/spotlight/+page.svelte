<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
</script>

<svelte:head>
	<title>Shop - OVYN</title>
</svelte:head>

<div class="mx-auto flex max-w-xl flex-col items-start gap-5 py-16">
	<p class="landing-eyebrow">A NEW DIRECTION</p>
	<h1 class="text-3xl font-semibold tracking-tight">Spotlight has moved on.</h1>
	<p class="text-neutral-400">Explore profile cosmetics in the Shop or compare Free and lifetime Premium plans.</p>
	<div class="flex flex-wrap gap-3">
		<Button href="/shop">Explore the Shop</Button>
		<Button href="/upgrade" variant="ghost">View plans</Button>
	</div>
</div>
