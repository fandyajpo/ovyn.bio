<script lang="ts">
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import { createTable, type SortingState } from '@tanstack/svelte-table';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import {
		availability,
		catalogColumns,
		catalogTableFeatures,
		typeLabel,
		type CatalogRow
	} from '#lib/tables/admin-catalog';
	import { formatDate, formatIdr } from '#lib/utils';

	let { data }: { data: PageData } = $props();

	const created = $derived(page.url.searchParams.get('created'));
	const updated = $derived(page.url.searchParams.get('updated'));

	let search = $state('');

	// TanStack Table handles sorting, filtering and pagination; the markup below is ours.
	const table = createTable({
		features: catalogTableFeatures,
		columns: catalogColumns,
		get data() {
			return data.products as CatalogRow[];
		},
		initialState: {
			pagination: { pageIndex: 0, pageSize: 10 }
		}
	});

	const sorting = $derived(table.atoms.sorting.get());
	const pagination = $derived(table.atoms.pagination.get());
	const rows = $derived(table.getRowModel().rows);
	const filteredCount = $derived(table.getFilteredRowModel().rows.length);
	const pageCount = $derived(Math.max(1, Math.ceil(filteredCount / pagination.pageSize)));

	const COLUMNS = [
		{ id: 'product', label: 'Product', sortable: true },
		{ id: 'type', label: 'Type', sortable: true },
		{ id: 'price', label: 'Price', sortable: false },
		{ id: 'availability', label: 'Availability', sortable: false },
		{ id: 'status', label: 'Status', sortable: true },
		{ id: 'updated', label: 'Updated', sortable: false }
	];

	function sortState(id: string): 'ascending' | 'descending' | 'none' {
		const current = sorting[0];
		if (!current || current.id !== id) return 'none';
		return current.desc ? 'descending' : 'ascending';
	}

	function toggleSort(id: string) {
		const current = sorting[0];
		const next: SortingState =
			!current || current.id !== id ? [{ id, desc: false }] : current.desc ? [] : [{ id, desc: true }];
		table.setSorting(next);
	}

	function onSearch(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		search = input.value;
		table.setColumnFilters(search.trim() ? [{ id: 'product', value: search }] : []);
		table.setPageIndex(0);
	}
</script>

<svelte:head>
	<title>Catalog manager - ovyn admin</title>
</svelte:head>

<div class="mx-auto flex max-w-6xl flex-col gap-7">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<span class="sticker sticker--blue">CATALOG</span>
			<h1 class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">Catalog manager</h1>
			<p class="mt-1 max-w-2xl text-neutral-400">Every product you sell in one table. Price changes affect new orders only, and products are deactivated rather than deleted so purchases stay intact.</p>
		</div>
		<Button href="/admin/catalog/new">New product</Button>
	</header>

	{#if created}
		<p class="rounded-xl border border-lime-300/40 bg-lime-300/10 px-4 py-3 text-sm text-lime-200" role="status">Created {created}.</p>
	{/if}
	{#if updated}
		<p class="rounded-xl border border-lime-300/40 bg-lime-300/10 px-4 py-3 text-sm text-lime-200" role="status">Saved changes to {updated}.</p>
	{/if}

	{#if data.products.length === 0}
		<Card class="p-10 text-center">
			<p class="font-medium text-neutral-200">No catalog products yet</p>
			<p class="mt-1 text-sm text-neutral-500">Create a monthly Premium plan or a profile cosmetic to get started.</p>
			<Button href="/admin/catalog/new" variant="secondary" class="mt-4">Create the first product</Button>
		</Card>
	{:else}
		<Card class="overflow-hidden">
			<div class="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 p-4">
				<label class="w-full sm:max-w-xs">
					<span class="sr-only">Search catalog products</span>
					<input
						type="search"
						value={search}
						oninput={onSearch}
						placeholder="Search products"
						class="w-full rounded-xl border border-neutral-800 bg-neutral-950/60 px-3.5 py-2.5 text-sm text-neutral-200 outline-none transition focus:border-lime-300/60"
					/>
				</label>
				<p class="font-mono text-xs text-neutral-500">{filteredCount} of {data.products.length} products</p>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full min-w-[56rem] text-left text-sm">
					<thead class="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
						<tr>
							{#each COLUMNS as column (column.id)}
								<th scope="col" class="px-5 py-3" aria-sort={sortState(column.id)}>
									{#if column.sortable}
										<button
											type="button"
											onclick={() => toggleSort(column.id)}
											class="inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors hover:text-neutral-200"
										>
											{column.label}
											<span aria-hidden="true">
												{sortState(column.id) === 'ascending' ? '↑' : sortState(column.id) === 'descending' ? '↓' : '↕'}
											</span>
										</button>
									{:else}
										{column.label}
									{/if}
								</th>
							{/each}
							<th scope="col" class="px-5 py-3"><span class="sr-only">Actions</span></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-neutral-800">
						{#each rows as row (row.id)}
							{@const product = row.original.product}
							<tr>
								<td class="px-5 py-3">
									<span class="block text-neutral-100">{product.name}</span>
									{#if product.description}<span class="mt-0.5 block max-w-md truncate text-xs text-neutral-500">{product.description}</span>{/if}
								</td>
								<td class="px-5 py-3 text-neutral-400">{typeLabel(row.original)}</td>
								<td class="whitespace-nowrap px-5 py-3 font-mono text-neutral-200">{formatIdr(product.price)}</td>
								<td class="px-5 py-3 text-neutral-400">{availability(row.original)}</td>
								<td class="px-5 py-3"><Badge tone={product.active ? 'lime' : 'neutral'} size="xs">{product.active ? 'active' : 'inactive'}</Badge></td>
								<td class="whitespace-nowrap px-5 py-3 text-neutral-500">{formatDate(product.updatedAt)}</td>
								<td class="whitespace-nowrap px-5 py-3 text-right"><a href="/admin/catalog/{product.id}" class="text-sm text-lime-300 hover:underline">Edit</a></td>
							</tr>
						{:else}
							<tr>
								<td colspan="7" class="px-5 py-8 text-center text-sm text-neutral-500">No products match that search.</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 px-5 py-3 text-xs text-neutral-500">
				<p>Showing {rows.length} of {filteredCount} products</p>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => table.previousPage()}
						disabled={pagination.pageIndex === 0}
						class="rounded-lg border border-neutral-700 px-3 py-1.5 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:text-neutral-600"
					>
						Previous
					</button>
					<span>Page {pagination.pageIndex + 1} of {pageCount}</span>
					<button
						type="button"
						onclick={() => table.nextPage()}
						disabled={pagination.pageIndex + 1 >= pageCount}
						class="rounded-lg border border-neutral-700 px-3 py-1.5 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:text-neutral-600"
					>
						Next
					</button>
				</div>
			</div>
		</Card>
	{/if}
</div>
