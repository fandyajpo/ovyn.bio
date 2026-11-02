<script lang="ts">
	import type { PageData } from './$types';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Select from '#lib/components/ui/Select.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import TemplateBlockEditor from '#lib/components/TemplateBlockEditor.svelte';
	import { PROFILE_THEME_OPTIONS } from '#lib/schemas/profile';
	import type { TemplateBlock } from '#lib/schemas/templates';

	type TemplateForm = {
		error?: string;
		ok?: string;
		fieldErrors?: Record<string, string>;
		blocksJson?: string | null;
		values?: {
			name?: unknown;
			description?: unknown;
			theme?: unknown;
			isPublic?: unknown;
		};
	};

	let { data, form }: { data: PageData; form?: TemplateForm } = $props();

	const themeOptions = PROFILE_THEME_OPTIONS.map((option) => ({ ...option }));

	function parseBlocks(raw: string | null | undefined): TemplateBlock[] | null {
		if (typeof raw !== 'string') return null;
		try {
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? (parsed as TemplateBlock[]) : null;
		} catch {
			return null;
		}
	}

	const submittedBlocks = $derived(parseBlocks(form?.blocksJson));
	const initialBlocks = $derived(submittedBlocks ?? data.template.blocks);
	const editorKey = $derived(`${data.template.id}:${form?.blocksJson ?? JSON.stringify(data.template.blocks)}`);

	function value(key: keyof NonNullable<TemplateForm['values']>, fallback: string) {
		const submitted = form?.values?.[key];
		return typeof submitted === 'string' ? submitted : fallback;
	}
</script>

<svelte:head>
	<title>Edit {data.template.name} - ovyn</title>
</svelte:head>

<div class="mx-auto flex max-w-6xl flex-col gap-6">
	<header class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<a href="/templates" class="text-sm text-neutral-500 hover:text-lime-300">← Templates</a>
			<span class="sticker sticker--lilac mt-3 block w-fit">LAYOUT BUILDER</span>
			<h1 class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">Edit {data.template.name}</h1>
			<p class="mt-1 max-w-2xl text-neutral-400">Drag blocks to reorder them, add new content from the palette, and write with markdown. Save when it looks right.</p>
		</div>
		<div>
			<Button href="/templates" variant="ghost">All templates</Button>
		</div>
	</header>

	{#if form?.error}<p class="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300" role="alert">{form.error}</p>{/if}
	{#if form?.ok}<p class="rounded-xl border border-lime-300/40 bg-lime-300/10 px-4 py-3 text-sm text-lime-200" role="status">{form.ok}</p>{/if}

	{#if data.plan.tier !== 'premium'}
		<Card class="flex flex-wrap items-center justify-between gap-4 p-5">
			<div>
				<h2 class="font-medium text-neutral-100">Saving layouts is part of Premium</h2>
				<p class="mt-1 text-sm text-neutral-400">Premium includes layout editing and templates.</p>
			</div>
			<Button href="/upgrade">Explore Premium</Button>
		</Card>
	{/if}

	<form method="POST" class="flex flex-col gap-5">
		<Card class="p-5">
			<div class="grid gap-4 sm:grid-cols-2">
				<Input name="name" label="Template name" required minlength={2} maxlength={40} value={value('name', data.template.name)} />
				<Input name="description" label="Description" maxlength={160} value={value('description', data.template.description ?? '')} />
				<Select name="theme" label="Page theme" options={themeOptions} value={value('theme', data.template.theme)} required />
				<Switch name="isPublic" label="Share in the community gallery" description="Others can preview and apply this layout." checked={form?.values ? Boolean(form.values.isPublic) : data.template.isPublic} />
			</div>
		</Card>

		{#key editorKey}
			<TemplateBlockEditor blocks={initialBlocks} />
		{/key}

		<div class="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800/70 bg-neutral-950/85 px-4 py-3 backdrop-blur">
			<p class="text-xs text-neutral-500">Blocks save in order. Empty blocks are skipped.</p>
			<div class="flex flex-wrap gap-2">
				<Button href="/templates" variant="ghost">Back to templates</Button>
				<Button type="submit" disabled={data.plan.tier !== 'premium'}>Save layout</Button>
			</div>
		</div>
	</form>
</div>
