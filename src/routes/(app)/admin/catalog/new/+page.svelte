<script lang="ts">
	import type { PageData } from './$types';
	import AdminCatalogForm from '#lib/components/AdminCatalogForm.svelte';
	import Card from '#lib/components/ui/Card.svelte';

	type CatalogForm = {
		error?: string;
		fieldErrors?: Record<string, string>;
		submittedValues?: Record<string, string>;
	};

	let { data, form }: { data: PageData; form?: CatalogForm } = $props();
</script>

<svelte:head>
	<title>New product - ovyn admin</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<header>
		<a href="/admin/catalog" class="text-sm text-neutral-500 hover:text-lime-300">← Catalog</a>
		<h1 class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">New product</h1>
		<p class="mt-1 text-neutral-400">Add a monthly Premium plan or a profile cosmetic. New listings start inactive unless you publish them.</p>
	</header>

	{#if form?.error}
		<p class="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300" role="alert">{form.error}</p>
	{/if}

	<Card class="p-5 sm:p-6">
		<AdminCatalogForm mode="create" values={form?.submittedValues ?? {}} errors={form?.fieldErrors ?? {}} />
	</Card>
</div>
