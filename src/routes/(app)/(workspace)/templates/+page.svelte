<script lang="ts">
	import type { PageData } from './$types';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Select from '#lib/components/ui/Select.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import { PROFILE_THEME_OPTIONS } from '#lib/schemas/profile';

	let { data, form }: { data: PageData; form?: { error?: string; ok?: string } } = $props();
	const themeOptions = PROFILE_THEME_OPTIONS.map((option) => ({ ...option }));
	const myTemplates = $derived(data.templates.filter((item) => item.isOwner));
	const communityTemplates = $derived(data.templates.filter((item) => item.template.isPublic && !item.isOwner));
</script>

<svelte:head>
	<title>Profile templates - ovyn</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<span class="sticker sticker--lilac">STYLE EXCHANGE</span>
		<h1 class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">Templates</h1>
		<p class="mt-1 max-w-2xl text-neutral-400">Save your current theme as a template. Keep it private or share it with the community so others can preview and use it.</p>
	</div>

	{#if form?.error}<p class="text-sm text-red-400" role="alert">{form.error}</p>{/if}
	{#if form?.ok}<p class="text-sm text-lime-300" role="status">{form.ok}</p>{/if}

	{#if data.plan.tier === 'premium'}
		<Card class="p-5">
			<h2 class="font-medium text-neutral-100">Save a profile layout</h2>
			<form method="POST" action="?/create" class="mt-4 grid gap-4 sm:grid-cols-2">
				<Input name="name" label="Template name" required minlength={2} maxlength={40} placeholder="Midnight sticker pack" />
				<Input name="description" label="Description" maxlength={160} placeholder="A little note about this look" />
				<Select name="theme" label="Theme to save" options={themeOptions} value={data.profile.theme} required />
				<Switch name="isPublic" label="Share in the community gallery" description="Public templates contain only preset styling and text." class="sm:col-span-2" />
				<div class="sm:col-span-2"><Button type="submit">Save template</Button></div>
			</form>
			<p class="mt-3 text-xs text-neutral-500">Templates never expose your uploads, private account data or links.</p>
		</Card>
	{:else}
		<Card class="flex flex-wrap items-center justify-between gap-4 p-5">
			<div><h2 class="font-medium text-neutral-100">Profile layouts are part of Premium</h2><p class="mt-1 text-sm text-neutral-400">Upgrade once for lifetime layout customization and templates.</p></div>
			<Button href="/upgrade">Explore Premium</Button>
		</Card>
	{/if}

	{#if myTemplates.length > 0}
		<section class="flex flex-col gap-3">
			<h2 class="font-[family-name:var(--font-display)] text-xl font-semibold">My templates</h2>
			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{#each myTemplates as item (item.template.id)}
					<Card class="flex flex-col gap-3 p-4">
						<div class="template-preview rounded-xl p-4" data-profile-theme={item.template.theme}>
							<span class="sticker sticker--dark">ovyn / preview</span>
							<p class="mt-4 font-[family-name:var(--font-display)] text-xl font-bold">Your page, your look.</p>
							<p class="font-mono text-xs">@your-name</p>
						</div>
						<div>
						<p class="font-medium text-neutral-100">{item.template.name}</p>
						<p class="text-xs text-neutral-500">{item.template.theme} · {item.template.isPublic ? 'Public' : 'Private'}</p>
						{#if item.template.description}<p class="mt-1 text-sm text-neutral-400">{item.template.description}</p>{/if}
					</div>
						<div class="mt-auto flex flex-wrap gap-2">
							<form method="POST" action="?/apply"><input type="hidden" name="id" value={item.template.id} /><Button type="submit" variant="secondary">Use template</Button></form>
							<form method="POST" action="?/visibility">
								<input type="hidden" name="id" value={item.template.id} />
								<input type="hidden" name="isPublic" value={item.template.isPublic ? 'off' : 'on'} />
								<Button type="submit" variant="ghost">{item.template.isPublic ? 'Make private' : 'Share publicly'}</Button>
							</form>
							<form method="POST" action="?/remove"><input type="hidden" name="id" value={item.template.id} /><Button type="submit" variant="ghost">Delete</Button></form>
						</div>
					</Card>
				{/each}
			</div>
		</section>
	{/if}

	<section class="flex flex-col gap-3">
		<div>
			<h2 class="font-[family-name:var(--font-display)] text-xl font-semibold">Community gallery</h2>
			<p class="text-sm text-neutral-500">Preview a public style and apply it to your page.</p>
		</div>
		{#if communityTemplates.length === 0}
			<Card class="p-6 text-sm text-neutral-500">No community templates shared yet. Publish one of your own to start the gallery.</Card>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{#each communityTemplates as item (item.template.id)}
					<Card class="flex flex-col gap-3 p-4">
						<div class="template-preview rounded-xl p-4" data-profile-theme={item.template.theme}>
							<span class="sticker sticker--dark">COMMUNITY TEMPLATE</span>
							<p class="mt-4 font-[family-name:var(--font-display)] text-xl font-bold">A page with personality.</p>
							<p class="font-mono text-xs">@your-name</p>
						</div>
						<div>
						<p class="font-medium text-neutral-100">{item.template.name}</p>
						<p class="text-xs text-neutral-500">by {item.ownerName || item.ownerSlug || 'ovyn member'} · {item.template.theme}</p>
						{#if item.template.description}<p class="mt-1 text-sm text-neutral-400">{item.template.description}</p>{/if}
						</div>
						{#if data.plan.tier === 'premium'}
							<form method="POST" action="?/apply" class="mt-auto"><input type="hidden" name="id" value={item.template.id} /><Button type="submit" variant="secondary">Use this template</Button></form>
						{:else}
							<a href="/upgrade" class="mt-auto text-sm text-lime-300 hover:underline">Premium to apply this layout ↗</a>
						{/if}
					</Card>
				{/each}
			</div>
		{/if}
	</section>
</div>
