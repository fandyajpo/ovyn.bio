<script lang="ts">
	import type { PageData } from './$types';
	import AdminCosmeticAssetUpload from '#lib/components/AdminCosmeticAssetUpload.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Checkbox from '#lib/components/ui/Checkbox.svelte';
	import DropdownSelect from '#lib/components/ui/DropdownSelect.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Select from '#lib/components/ui/Select.svelte';

	type CatalogForm = {
		error?: string;
		ok?: string;
		action?: 'create' | 'update';
		submittedId?: string;
		submittedValues?: Record<string, string>;
		fieldErrors?: Record<string, string>;
	};

	let { data, form }: { data: PageData; form?: CatalogForm } = $props();

	const productTypeOptions = [
		{ value: 'plan', label: 'Premium plan' },
		{ value: 'cosmetic', label: 'Cosmetic' },
		{ value: 'profile_spotlight', label: 'Profile spotlight' },
		{ value: 'guild_spotlight', label: 'Guild spotlight' }
	];
	const cosmeticKindOptions = [
		{ value: 'frame', label: 'Avatar frame' },
		{ value: 'wallpaper', label: 'Wallpaper' },
		{ value: 'badge', label: 'Badge' }
	];
	const createValues: Record<string, string> = $derived(form?.action === 'create' ? form.submittedValues ?? {} : {});
	const createErrors: Record<string, string> = $derived(form?.action === 'create' ? form.fieldErrors ?? {} : {});

	function updateValues(productId: string) {
		return form?.action === 'update' && form.submittedId === productId ? form.submittedValues ?? {} : null;
	}

	function updateErrors(productId: string) {
		return form?.action === 'update' && form.submittedId === productId ? form.fieldErrors ?? {} : {};
	}

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
		<p class="mt-1 text-sm text-neutral-500">New listings start inactive unless you check Publish. Premium plan purchases grant 30 days and renew manually through DOKU.</p>
		<form method="POST" action="?/create" class="mt-5 grid gap-4 sm:grid-cols-2">
			<Select
				name="category"
				label="Product type"
				options={productTypeOptions}
				value={createValues.category ?? 'cosmetic'}
				required
				error={createErrors.category}
			/>
			<Input name="name" label="Name" value={createValues.name ?? ''} required minlength={2} maxlength={100} error={createErrors.name} />
			<Input name="price" label="Price (IDR)" type="number" value={createValues.price ?? ''} min={0} step={1} required error={createErrors.price} />
			<Input name="durationDays" label="Duration in days" type="number" value={createValues.durationDays ?? ''} min={1} max={365} hint="Premium plans must be 30 days; spotlight terms can be 1–365 days." error={createErrors.durationDays} />
			<Input name="description" label="Description" value={createValues.description ?? ''} textarea maxlength={1000} class="sm:col-span-2" />
			<div class="rounded-xl border border-neutral-800 p-4 sm:col-span-2">
				<p class="mb-3 text-sm font-medium text-neutral-200">Cosmetic details (cosmetic products only)</p>
				<div class="grid gap-4 sm:grid-cols-2">
					<DropdownSelect
						name="kind"
						label="Cosmetic slot"
						options={cosmeticKindOptions}
						value={createValues.kind ?? 'frame'}
						required
						error={createErrors.kind}
					/>
					<Input name="accentColor" label="Accent color" value={createValues.accentColor ?? ''} placeholder="#D5FF35" pattern="#[0-9a-fA-F]{6}" error={createErrors.accentColor} />
					<Input name="pointsPrice" label="Points price" type="number" value={createValues.pointsPrice ?? ''} min={0} step={1} hint="Leave empty to disallow points redemption." error={createErrors.pointsPrice} />
					<Input name="stockLimit" label="Stock limit" type="number" value={createValues.stockLimit ?? ''} min={1} step={1} hint="Leave empty for unlimited stock." error={createErrors.stockLimit} />
					<Input name="dropEndsAt" label="Drop end date (UTC)" type="date" value={createValues.dropEndsAt ?? ''} error={createErrors.dropEndsAt} />
					<div><p class="mb-2 text-sm text-neutral-300">Product artwork</p><AdminCosmeticAssetUpload initialKey={createValues.assetKey ?? null} label="Upload cosmetic image" error={createErrors.assetKey} /></div>
				</div>
			</div>
			<Checkbox name="active" label="Publish immediately" checked={createValues.active === 'on'} class="sm:col-span-2" />
			<div class="sm:col-span-2"><Button type="submit">Create product</Button></div>
		</form>
	</Card>

	<section class="flex flex-col gap-4">
		<div><h2 class="font-[family-name:var(--font-display)] text-2xl font-semibold">Existing products</h2><p class="mt-1 text-sm text-neutral-500">Pricing changes affect new orders only. Past orders retain their recorded amounts.</p></div>
		{#if data.products.length === 0}
			<Card class="p-8 text-center text-neutral-500">No catalog products yet.</Card>
		{:else}
			{#each data.products as row (row.product.id)}
				{@const values = updateValues(row.product.id)}
				{@const errors = updateErrors(row.product.id)}
				<Card class="p-5">
					<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
						<div><p class="font-medium text-neutral-100">{row.product.name}</p><p class="font-mono text-xs uppercase text-neutral-500">{row.product.category}</p></div>
						<span class="rounded-full border px-2 py-1 text-xs {row.product.active ? 'border-lime-300/40 text-lime-300' : 'border-neutral-700 text-neutral-500'}">{row.product.active ? 'Active' : 'Inactive'}</span>
					</div>
					{#if row.product.category === 'plan'}
						<form method="POST" action="?/update" class="grid gap-4 sm:grid-cols-2">
							<input type="hidden" name="id" value={row.product.id} />
							<input type="hidden" name="durationDays" value="30" />
							<Input name="name" label="Plan name" value={values?.name ?? row.product.name} required minlength={2} maxlength={100} error={errors.name} />
							<Input name="price" label="Price (IDR per 30 days)" type="number" value={values?.price ?? String(row.product.price)} min={1} step={1} required error={errors.price} />
							<Input name="description" label="Description" value={values?.description ?? row.product.description ?? ''} textarea maxlength={1000} class="sm:col-span-2" error={errors.description} />
							<p class="text-sm text-neutral-500 sm:col-span-2">Premium lasts 30 days from payment. Members renew manually; current features remain available on Free.</p>
							<Checkbox name="active" label="Available for purchase" checked={values ? values.active === 'on' : row.product.active} class="sm:col-span-2" />
							<div class="sm:col-span-2"><Button type="submit">Save plan</Button></div>
						</form>
					{:else if row.product.category === 'cosmetic' && !row.cosmetic}
						<p class="text-sm text-red-400">Cosmetic details are missing for this product; it cannot be edited here.</p>
					{:else}
						<form method="POST" action="?/update" class="grid gap-4 sm:grid-cols-2">
							<input type="hidden" name="id" value={row.product.id} />
							<Input name="name" label="Name" value={values?.name ?? row.product.name} required minlength={2} maxlength={100} error={errors.name} />
							<Input name="price" label="Price (IDR)" type="number" value={values?.price ?? String(row.product.price)} min={0} step={1} required error={errors.price} />
							<Input name="description" label="Description" value={values?.description ?? row.product.description ?? ''} textarea maxlength={1000} class="sm:col-span-2" error={errors.description} />
							{#if row.product.category === 'cosmetic' && row.cosmetic}
								<Select name="kind" label="Cosmetic slot" options={cosmeticKindOptions} value={values?.kind ?? row.cosmetic.kind} required error={errors.kind} />
								<Input name="accentColor" label="Accent color" value={values?.accentColor ?? row.cosmetic.accentColor ?? ''} pattern="#[0-9a-fA-F]{6}" placeholder="#D5FF35" error={errors.accentColor} />
								<Input name="pointsPrice" label="Points price" type="number" value={values?.pointsPrice ?? String(row.cosmetic.pointsPrice ?? '')} min={0} step={1} error={errors.pointsPrice} />
								<Input name="stockLimit" label="Stock limit" type="number" value={values?.stockLimit ?? String(row.cosmetic.stockLimit ?? '')} min={1} step={1} error={errors.stockLimit} />
								<Input name="dropEndsAt" label="Drop end date (UTC)" type="date" value={values?.dropEndsAt ?? dateValue(row.cosmetic.dropEndsAt)} error={errors.dropEndsAt} />
								<div><p class="mb-2 text-sm text-neutral-300">Product artwork</p><AdminCosmeticAssetUpload initialKey={values?.assetKey ?? row.cosmetic.assetKey} label="Replace image" error={errors.assetKey} /></div>
							{:else}
								<Input name="durationDays" label="Spotlight duration in days" type="number" value={values?.durationDays ?? String(row.product.durationDays ?? '')} min={1} max={365} required error={errors.durationDays} />
							{/if}
							<Checkbox name="active" label="Available in the shop" checked={values ? values.active === 'on' : row.product.active} class="sm:col-span-2" />
							<div class="sm:col-span-2"><Button type="submit">Save changes</Button></div>
						</form>
					{/if}
				</Card>
			{/each}
		{/if}
	</section>
</div>
