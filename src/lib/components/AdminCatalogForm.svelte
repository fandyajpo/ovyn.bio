<script lang="ts">
	import AdminCosmeticAssetUpload from '#lib/components/AdminCosmeticAssetUpload.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Checkbox from '#lib/components/ui/Checkbox.svelte';
	import DropdownSelect from '#lib/components/ui/DropdownSelect.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Select from '#lib/components/ui/Select.svelte';

	type CatalogProduct = {
		id: string;
		name: string;
		description: string | null;
		price: number;
		active: boolean;
		category: 'plan' | 'cosmetic';
		durationDays: number | null;
	};

	type CatalogCosmetic = {
		kind: 'frame' | 'wallpaper' | 'badge';
		assetKey: string;
		accentColor: string | null;
		pointsPrice: number | null;
		stockLimit: number | null;
		dropEndsAt: Date | string | null;
	};

	let {
		mode,
		product = null,
		cosmetic = null,
		values = {},
		errors = {}
	}: {
		mode: 'create' | 'edit';
		product?: CatalogProduct | null;
		cosmetic?: CatalogCosmetic | null;
		values?: Record<string, string>;
		errors?: Record<string, string>;
	} = $props();

	const isCreate = mode === 'create';

	const productTypeOptions = [
		{ value: 'cosmetic', label: 'Cosmetic' },
		{ value: 'plan', label: 'Premium lifetime plan' }
	];
	const cosmeticKindOptions = [
		{ value: 'frame', label: 'Avatar frame' },
		{ value: 'wallpaper', label: 'Wallpaper' },
		{ value: 'badge', label: 'Badge' }
	];

	let category = $state<string>(values.category ?? product?.category ?? 'cosmetic');
	const showsCosmetic = $derived(isCreate ? category === 'cosmetic' : product?.category === 'cosmetic');
	const priceReadonly = $derived(!isCreate && product?.category === 'plan' && product.durationDays !== 30);

	function fieldValue(key: string, fallback: string) {
		return values[key] ?? fallback;
	}

	function dateValue(value: Date | string | null | undefined) {
		if (!value) return '';
		return new Date(value).toISOString().slice(0, 10);
	}
</script>

<form method="POST" class="grid gap-4 sm:grid-cols-2">
	{#if isCreate}
		<Select
			name="category"
			label="Product type"
			options={productTypeOptions}
			bind:value={category}
			required
			error={errors.category}
		/>
	{:else if product}
		<input type="hidden" name="id" value={product.id} />
		<div class="sm:col-span-2">
			<p class="text-sm text-neutral-500">
				{product.category === 'plan' ? 'Premium plan' : 'Cosmetic'} · created listing stays the same product, only its details change.
			</p>
		</div>
	{/if}

	<Input name="name" label="Name" value={fieldValue('name', product?.name ?? '')} required minlength={2} maxlength={100} error={errors.name} />
	<Input
		name="price"
		label={priceReadonly ? 'Lifetime price (IDR)' : 'Price (IDR)'}
		type="number"
		value={fieldValue('price', product ? String(product.price) : '')}
		min={priceReadonly ? 1 : 0}
		step={1}
		required
		readonly={priceReadonly}
		hint={priceReadonly ? 'Lifetime Premium is fixed at Rp 100.000.' : null}
		error={errors.price}
	/>
	<Input
		name="description"
		label="Description"
		value={fieldValue('description', product?.description ?? '')}
		textarea
		maxlength={1000}
		class="sm:col-span-2"
		error={errors.description}
	/>

	{#if isCreate}
		<Input
			name="durationDays"
			label="Duration in days"
			type="number"
			value={fieldValue('durationDays', '')}
			min={1}
			max={365}
			hint="Leave blank for lifetime Premium. Legacy 30-day plans keep their duration."
			error={errors.durationDays}
		/>
	{:else if product}
		<input type="hidden" name="durationDays" value={product.durationDays ?? ''} />
		{#if product.category === 'plan'}
			<p class="self-center text-sm text-neutral-500">
				{product.durationDays === 30 ? 'Legacy 30-day plan. Keep the price and duration unchanged or deactivate it.' : 'Lifetime access with no expiry.'}
			</p>
		{/if}
	{/if}

	{#if showsCosmetic}
		<div class="rounded-xl border border-neutral-800 p-4 sm:col-span-2">
			<p class="mb-3 text-sm font-medium text-neutral-200">Cosmetic details</p>
			<div class="grid gap-4 sm:grid-cols-2">
				<DropdownSelect
					name="kind"
					label="Cosmetic slot"
					options={cosmeticKindOptions}
					value={fieldValue('kind', cosmetic?.kind ?? 'frame')}
					required
					error={errors.kind}
				/>
				<Input
					name="accentColor"
					label="Accent color"
					value={fieldValue('accentColor', cosmetic?.accentColor ?? '')}
					placeholder="#CDBCF3"
					pattern="#[0-9a-fA-F]{6}"
					error={errors.accentColor}
				/>
				<Input
					name="pointsPrice"
					label="Points price"
					type="number"
					value={fieldValue('pointsPrice', cosmetic?.pointsPrice === null || cosmetic?.pointsPrice === undefined ? '' : String(cosmetic.pointsPrice))}
					min={0}
					step={1}
					hint="Leave empty to disallow points redemption."
					error={errors.pointsPrice}
				/>
				<Input
					name="stockLimit"
					label="Stock limit"
					type="number"
					value={fieldValue('stockLimit', cosmetic?.stockLimit === null || cosmetic?.stockLimit === undefined ? '' : String(cosmetic.stockLimit))}
					min={1}
					step={1}
					hint="Leave empty for unlimited stock."
					error={errors.stockLimit}
				/>
				<Input
					name="dropEndsAt"
					label="Drop end date (UTC)"
					type="date"
					value={fieldValue('dropEndsAt', dateValue(cosmetic?.dropEndsAt))}
					error={errors.dropEndsAt}
				/>
				<div>
					<p class="mb-2 text-sm text-neutral-300">Product artwork</p>
					<AdminCosmeticAssetUpload
						initialKey={fieldValue('assetKey', cosmetic?.assetKey ?? '') || null}
						label={isCreate ? 'Upload cosmetic image' : 'Replace image'}
						error={errors.assetKey}
					/>
				</div>
			</div>
		</div>
	{/if}

	<Checkbox
		name="active"
		label={isCreate ? 'Publish immediately' : 'Available for purchase'}
		checked={values.active ? values.active === 'on' : (product?.active ?? false)}
		class="sm:col-span-2"
	/>

	<div class="flex flex-wrap gap-2 sm:col-span-2">
		<Button type="submit">{isCreate ? 'Create product' : 'Save changes'}</Button>
		<Button href="/admin/catalog" variant="ghost">Cancel</Button>
	</div>
</form>
