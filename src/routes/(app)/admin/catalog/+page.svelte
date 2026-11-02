<script lang="ts">
	import type { PageData } from './$types';
	import AdminCosmeticAssetUpload from '#lib/components/AdminCosmeticAssetUpload.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';

	let { data, form }: { data: PageData; form?: { error?: string; ok?: string } } = $props();

	function dateValue(value: Date | null) {
		return value ? new Date(value).toISOString().slice(0, 10) : '';
	}
</script>

<svelte:head>
	<title>Catalog manager — OVYN Admin</title>
</svelte:head>

<div class="mx-auto flex max-w-5xl flex-col gap-7">
	<div>
		<a href="/admin" class="text-sm text-neutral-500 hover:text-lime-300">← Monetization</a>
		<h1 class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">Catalog manager</h1>
		<p class="mt-1 text-neutral-400">Edit prices and availability. Deactivate items to stop selling them; products are not deleted so existing purchases stay intact.</p>
	</div>

	{#if form?.error}<p class="rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300" role="alert">{form.error}</p>{/if}
	{#if form?.ok}<p class="rounded-lg border border-lime-300/40 bg-lime-300/10 px-4 py-3 text-sm text-lime-200" role="status">{form.ok}</p>{/if}

	<Card class="p-5 sm:p-6">
		<h2 class="font-[family-name:var(--font-display)] text-xl font-semibold">Add a product</h2>
		<p class="mt-1 text-sm text-neutral-500">New listings start inactive unless you check Publish. Spotlight prices are charged through the existing DOKU flow.</p>
		<form method="POST" action="?/create" class="mt-5 grid gap-4 sm:grid-cols-2">
			<label class="block text-sm text-neutral-300">Product type
				<select name="category" class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100">
					<option value="cosmetic">Cosmetic</option>
					<option value="profile_spotlight">Profile spotlight</option>
					<option value="guild_spotlight">Guild spotlight</option>
				</select>
			</label>
			<label class="block text-sm text-neutral-300">Name<input name="name" required minlength="2" maxlength="100" class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100" /></label>
			<label class="block text-sm text-neutral-300">Price (IDR)<input name="price" type="number" min="0" step="1" required class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100" /></label>
			<label class="block text-sm text-neutral-300">Spotlight duration in days<input name="durationDays" type="number" min="1" max="365" class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100" /><span class="mt-1 block text-xs text-neutral-500">Only needed for spotlight products.</span></label>
			<label class="block text-sm text-neutral-300 sm:col-span-2">Description<textarea name="description" maxlength="1000" rows="2" class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"></textarea></label>
			<div class="rounded-lg border border-neutral-800 p-4 sm:col-span-2">
				<p class="mb-3 text-sm font-medium text-neutral-200">Cosmetic details</p>
				<div class="grid gap-4 sm:grid-cols-2">
					<label class="block text-sm text-neutral-300">Cosmetic slot<select name="kind" class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"><option value="frame">Avatar frame</option><option value="wallpaper">Wallpaper</option><option value="badge">Badge</option></select></label>
					<label class="block text-sm text-neutral-300">Accent color<input name="accentColor" type="text" placeholder="#D5FF35" pattern="#[0-9a-fA-F]{6}" class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100" /></label>
					<label class="block text-sm text-neutral-300">Points price<input name="pointsPrice" type="number" min="0" step="1" class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100" /><span class="mt-1 block text-xs text-neutral-500">Leave empty to disallow points redemption.</span></label>
					<label class="block text-sm text-neutral-300">Stock limit<input name="stockLimit" type="number" min="1" step="1" class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100" /><span class="mt-1 block text-xs text-neutral-500">Leave empty for unlimited stock.</span></label>
					<label class="block text-sm text-neutral-300">Drop end date (UTC)<input name="dropEndsAt" type="date" class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100" /></label>
					<div><p class="mb-2 text-sm text-neutral-300">Product artwork</p><AdminCosmeticAssetUpload label="Upload cosmetic image" /></div>
				</div>
			</div>
			<label class="flex items-center gap-2 text-sm text-neutral-300 sm:col-span-2"><input type="checkbox" name="active" /> Publish immediately</label>
			<div class="sm:col-span-2"><Button type="submit">Create product</Button></div>
		</form>
	</Card>

	<section class="flex flex-col gap-4">
		<div><h2 class="font-[family-name:var(--font-display)] text-2xl font-semibold">Existing products</h2><p class="mt-1 text-sm text-neutral-500">Pricing changes affect new orders only. Past orders retain their recorded amounts.</p></div>
		{#if data.products.length === 0}
			<Card class="p-8 text-center text-neutral-500">No catalog products yet.</Card>
		{:else}
			{#each data.products as row (row.product.id)}
				<Card class="p-5">
					<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
						<div><p class="font-medium text-neutral-100">{row.product.name}</p><p class="font-mono text-xs uppercase text-neutral-500">{row.product.category}</p></div>
						<span class="rounded-full border px-2 py-1 text-xs {row.product.active ? 'border-lime-300/40 text-lime-300' : 'border-neutral-700 text-neutral-500'}">{row.product.active ? 'Active' : 'Inactive'}</span>
					</div>
					{#if row.product.category === 'plan'}
						<p class="text-sm text-amber-300">Plan listings are read-only because paid plan entitlements are not implemented yet. They cannot be activated from this panel.</p>
					{:else if row.product.category === 'cosmetic' && !row.cosmetic}
						<p class="text-sm text-red-400">Cosmetic details are missing for this product; it cannot be edited here.</p>
					{:else}
						<form method="POST" action="?/update" class="grid gap-4 sm:grid-cols-2">
							<input type="hidden" name="id" value={row.product.id} />
							<label class="block text-sm text-neutral-300">Name<input name="name" value={row.product.name} required minlength="2" maxlength="100" class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100" /></label>
							<label class="block text-sm text-neutral-300">Price (IDR)<input name="price" type="number" min="0" step="1" value={row.product.price} required class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100" /></label>
							<label class="block text-sm text-neutral-300 sm:col-span-2">Description<textarea name="description" maxlength="1000" rows="2" class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100">{row.product.description ?? ''}</textarea></label>
							{#if row.product.category === 'cosmetic' && row.cosmetic}
								<label class="block text-sm text-neutral-300">Cosmetic slot<select name="kind" value={row.cosmetic.kind} class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"><option value="frame">Avatar frame</option><option value="wallpaper">Wallpaper</option><option value="badge">Badge</option></select></label>
								<label class="block text-sm text-neutral-300">Accent color<input name="accentColor" type="text" value={row.cosmetic.accentColor ?? ''} pattern="#[0-9a-fA-F]{6}" placeholder="#D5FF35" class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100" /></label>
								<label class="block text-sm text-neutral-300">Points price<input name="pointsPrice" type="number" min="0" step="1" value={row.cosmetic.pointsPrice ?? ''} class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100" /></label>
								<label class="block text-sm text-neutral-300">Stock limit<input name="stockLimit" type="number" min="1" step="1" value={row.cosmetic.stockLimit ?? ''} class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100" /></label>
								<label class="block text-sm text-neutral-300">Drop end date (UTC)<input name="dropEndsAt" type="date" value={dateValue(row.cosmetic.dropEndsAt)} class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100" /></label>
								<div><p class="mb-2 text-sm text-neutral-300">Product artwork</p><AdminCosmeticAssetUpload initialKey={row.cosmetic.assetKey} label="Replace image" /></div>
								{:else}
								<label class="block text-sm text-neutral-300">Spotlight duration in days<input name="durationDays" type="number" min="1" max="365" value={row.product.durationDays ?? ''} required class="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100" /></label>
							{/if}
							<label class="flex items-center gap-2 text-sm text-neutral-300 sm:col-span-2"><input type="checkbox" name="active" checked={row.product.active} /> Available in the shop</label>
							<div class="sm:col-span-2"><Button type="submit">Save changes</Button></div>
						</form>
					{/if}
				</Card>
			{/each}
		{/if}
	</section>
</div>
