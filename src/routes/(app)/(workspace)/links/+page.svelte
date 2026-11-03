<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { superForm } from 'sveltekit-superforms';
	import type { PageData } from './$types';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Select from '#lib/components/ui/Select.svelte';
	import LinkProviderIcon from '#lib/components/LinkProviderIcon.svelte';
	import { toast } from '#lib/components/ui/toasts.svelte.ts';
	import {
		PROFILE_LINK_PROVIDER_IDS,
		PROFILE_LINK_PROVIDER_LABELS,
		type ProfileLinkProvider
	} from '#lib/schemas/profile-links';

	let { data, form }: { data: PageData; form?: { error?: string; ok?: string } } = $props();

	// The add form is owned by Superforms: shared Zod schema, server validation,
	// pending and message state, and progressive enhancement in one place.
	const {
		form: addForm,
		errors: addErrors,
		message: addMessage,
		enhance: enhanceAdd,
		submitting: addSubmitting
	} = superForm(untrack(() => data.form));

	const providerOptions = PROFILE_LINK_PROVIDER_IDS.map((value) => ({
		value,
		label: PROFILE_LINK_PROVIDER_LABELS[value]
	}));

	type EditableLink = { id: string; provider: string; label: string; url: string };
	type PageLink = PageData['links'][number];

	let editing = $state<EditableLink | null>(null);

	function providerLabel(value: string) {
		return PROFILE_LINK_PROVIDER_LABELS[value as ProfileLinkProvider] ?? value;
	}

	const CRYPTO_PROVIDERS = ['bitcoin', 'ethereum', 'litecoin', 'solana', 'xrp', 'monero'];

	function isCrypto(value: string) {
		return CRYPTO_PROVIDERS.includes(value);
	}

	function urlLabel(value: string) {
		if (value === 'email') return 'Email address';
		return isCrypto(value) ? 'Wallet address or HTTPS explorer link' : 'Profile URL';
	}

	function urlPlaceholder(value: string) {
		return value === 'email' ? 'you@example.com' : 'https://…';
	}

	function startEdit(link: EditableLink) {
		editing = { id: link.id, provider: link.provider, label: link.label, url: link.url };
	}

	function cancelEdit() {
		editing = null;
	}

	// A successful add, update or remove closes the editor.
	$effect(() => {
		if (form?.ok) editing = null;
	});

	// Drag to reorder: the ids below are the displayed order, saved as sortOrder.
	let order = $state<string[]>(untrack(() => data.links.map((link) => link.id)));
	let dragId = $state<string | null>(null);
	let saving = $state(false);
	let listEl = $state<HTMLDivElement | undefined>(undefined);

	const orderedLinks = $derived(
		order
			.map((id) => data.links.find((link) => link.id === id))
			.filter((link): link is PageLink => link !== undefined)
	);

	function savedIds() {
		return data.links.map((link) => link.id).join('|');
	}

	function orderChanged() {
		return order.join('|') !== savedIds();
	}

	// Follow the server's order again after a save, a removal or a new link.
	$effect(() => {
		const ids = data.links.map((link) => link.id);
		if (dragId || saving) return;
		untrack(() => {
			if (ids.join('|') !== order.join('|')) order = ids;
		});
	});

	function moveItem(id: string, delta: number) {
		const from = order.indexOf(id);
		const to = from + delta;
		if (from < 0 || to < 0 || to >= order.length) return false;
		const next = order.slice();
		const [moved] = next.splice(from, 1);
		if (!moved) return false;
		next.splice(to, 0, moved);
		order = next;
		return true;
	}

	function onHandlePointerDown(event: PointerEvent, id: string) {
		if (event.button !== 0) return;
		const handle = event.currentTarget as HTMLElement;
		handle.setPointerCapture?.(event.pointerId);
		dragId = id;
	}

	function onHandlePointerMove(event: PointerEvent) {
		const dragged = dragId;
		if (!dragged || !listEl) return;
		const target = Array.from(listEl.querySelectorAll<HTMLElement>('[data-order-id]')).find((card) => {
			const rect = card.getBoundingClientRect();
			return event.clientY >= rect.top && event.clientY <= rect.bottom;
		});
		const targetId = target?.dataset.orderId;
		if (!targetId || targetId === dragged) return;

		const from = order.indexOf(dragged);
		const to = order.indexOf(targetId);
		if (from < 0 || to < 0 || from === to) return;

		const next = order.slice();
		const [moved] = next.splice(from, 1);
		if (!moved) return;
		next.splice(to, 0, moved);
		order = next;
	}

	function endDrag(event: PointerEvent) {
		if (!dragId) return;
		const handle = event.currentTarget as HTMLElement;
		if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
		dragId = null;
		if (orderChanged()) void saveOrder();
	}

	function onHandleKeydown(event: KeyboardEvent, id: string) {
		if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
		event.preventDefault();
		if (!moveItem(id, event.key === 'ArrowUp' ? -1 : 1)) return;
		void saveOrder();
		requestAnimationFrame(() => {
			listEl?.querySelector<HTMLElement>(`[data-handle="${id}"]`)?.focus();
		});
	}

	async function saveOrder() {
		if (saving) return;
		saving = true;
		const body = new FormData();
		for (const id of order) body.append('id', id);

		try {
			const response = await fetch('?/reorder', { method: 'POST', body });
			if (!response.ok) throw new Error('Reorder failed');
			toast('success', 'Link order saved');
			await invalidateAll();
		} catch {
			order = data.links.map((link) => link.id);
			toast('error', 'Could not save the new order');
		} finally {
			saving = false;
		}
	}
</script>

{#snippet providerOption(option: { value: string; label: string; disabled?: boolean })}
	<LinkProviderIcon provider={option.value} size="sm" />
{/snippet}

<svelte:head>
	<title>Social links - ovyn</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<span class="sticker sticker--blue">YOUR INTERNET, ONE PAGE</span>
		<h1 class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">Social links</h1>
		<p class="mt-1 max-w-2xl text-neutral-400">Add your public profiles, payment links, gaming profiles, crypto addresses or a custom URL. These links appear on your public page.</p>
	</div>

	{#if form?.error}<p class="text-sm text-red-400" role="alert">{form.error}</p>{/if}
	{#if form?.ok}<p class="text-sm text-lime-300" role="status">{form.ok}</p>{/if}

	<Card class="p-5">
		<h2 class="font-medium text-neutral-100">Add a link</h2>
		<form method="POST" action="?/add" use:enhanceAdd class="mt-4 grid gap-4 sm:grid-cols-2">
			<Select
				name="provider"
				label="Platform"
				options={providerOptions}
				bind:value={$addForm.provider}
				required
				optionIcon={providerOption}
				error={$addErrors.provider?.[0] ?? null}
			/>
			<Input
				name="url"
				label={urlLabel($addForm.provider)}
				placeholder={urlPlaceholder($addForm.provider)}
				bind:value={$addForm.url}
				required
				maxlength={2048}
				error={$addErrors.url?.[0] ?? null}
			/>
			{#if $addForm.provider === 'custom_url'}
				<Input
					name="label"
					label="Link label"
					placeholder="My portfolio"
					bind:value={$addForm.label}
					required
					maxlength={48}
					class="sm:col-span-2"
					error={$addErrors.label?.[0] ?? null}
				/>
			{/if}
			{#if $addMessage}
				<p class="text-sm text-neutral-300 sm:col-span-2" role="status">{$addMessage}</p>
			{/if}
			<div class="sm:col-span-2"><Button type="submit" loading={$addSubmitting}>Add link</Button></div>
		</form>
		<p class="mt-3 text-xs text-neutral-500">Links are shown publicly on your profile. Only HTTPS web links are accepted for social platforms; email and wallet links use their expected address format.</p>
	</Card>

	<section class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="font-[family-name:var(--font-display)] text-xl font-semibold">Your links</h2>
			<span class="font-mono text-xs text-neutral-500">{orderedLinks.length} / 40</span>
		</div>

		<p class="text-xs text-neutral-500">Drag the handle to reorder, or focus it and use the arrow keys. This is the order visitors see.</p>

		{#if data.links.length === 0}
			<Card class="p-6 text-sm text-neutral-500">Your page is link-free for now. Add the places people can find you.</Card>
		{:else}
			<div bind:this={listEl} class="flex flex-col gap-3">
				{#each orderedLinks as link (link.id)}
					<div class="link-row" class:is-dragging={dragId === link.id} data-order-id={link.id}>
						<Card class="min-w-0 p-4">
							<div class="flex items-start gap-3">
								<button
									type="button"
									class="drag-handle"
									data-handle={link.id}
									aria-label={`Reorder ${link.label}`}
									onpointerdown={(event) => onHandlePointerDown(event, link.id)}
									onpointermove={onHandlePointerMove}
									onpointerup={endDrag}
									onpointercancel={endDrag}
									onlostpointercapture={endDrag}
									onkeydown={(event) => onHandleKeydown(event, link.id)}
								>
									<svg viewBox="0 0 16 24" aria-hidden="true" width="10" height="16">
										<circle cx="5" cy="5" r="1.4" fill="currentColor" />
										<circle cx="11" cy="5" r="1.4" fill="currentColor" />
										<circle cx="5" cy="12" r="1.4" fill="currentColor" />
										<circle cx="11" cy="12" r="1.4" fill="currentColor" />
										<circle cx="5" cy="19" r="1.4" fill="currentColor" />
										<circle cx="11" cy="19" r="1.4" fill="currentColor" />
									</svg>
								</button>

								<div class="flex min-w-0 flex-1 items-start justify-between gap-3">
									<div class="flex min-w-0 items-center gap-3">
										<LinkProviderIcon provider={link.provider} />
										<div class="min-w-0">
											<p class="font-mono text-[10px] uppercase tracking-wider text-neutral-500">{providerLabel(link.provider)}</p>
											<a href={link.url} target="_blank" rel="noopener noreferrer nofollow" class="mt-1 block truncate font-medium text-lime-300 hover:underline">{link.label}</a>
										</div>
									</div>
									<div class="flex shrink-0 items-center gap-2">
										<button
											type="button"
											onclick={() => startEdit(link)}
											class="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-300 transition hover:border-lime-300/50 hover:text-lime-300"
											aria-label="Edit {link.label}"
										>
											Edit
										</button>
										<form method="POST" action="?/remove">
											<input type="hidden" name="id" value={link.id} />
											<button type="submit" class="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-400 transition hover:border-red-400/50 hover:text-red-300" aria-label="Remove {link.label}">Remove</button>
										</form>
									</div>
								</div>
							</div>

							{#if editing && editing.id === link.id}
								<form
									method="POST"
									action="?/update"
									class="mt-4 grid gap-4 border-t border-neutral-800 pt-4 sm:grid-cols-2"
								>
									<input type="hidden" name="id" value={link.id} />
									<Select name="provider" label="Platform" options={providerOptions} bind:value={editing.provider} required optionIcon={providerOption} />
									<Input
										name="url"
										label={urlLabel(editing.provider)}
										placeholder={urlPlaceholder(editing.provider)}
										bind:value={editing.url}
										required
										maxlength={2048}
									/>
									{#if editing.provider === 'custom_url'}
										<Input name="label" label="Link label" placeholder="My portfolio" bind:value={editing.label} required maxlength={48} class="sm:col-span-2" />
									{/if}
									<div class="flex flex-wrap items-center gap-2 sm:col-span-2">
										<Button type="submit">Save changes</Button>
										<button type="button" onclick={cancelEdit} class="rounded-full border border-neutral-700 px-3.5 py-2 text-xs text-neutral-300 transition hover:bg-neutral-800">Cancel</button>
									</div>
								</form>
							{/if}
						</Card>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.link-row { transition: transform 160ms ease; }
	.link-row.is-dragging { transform: scale(1.01); }

	.link-row.is-dragging :global(.ovyn-surface) {
		border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
		box-shadow: 0 18px 40px rgb(0 0 0 / 16%);
	}

	.drag-handle {
		display: grid;
		width: 2.4rem;
		height: 2.75rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 0.7rem;
		background: color-mix(in srgb, var(--color-surface) 70%, transparent);
		color: var(--color-muted);
		cursor: grab;
		touch-action: none;
		transition: color 160ms ease, border-color 160ms ease, background-color 160ms ease;
	}

	.drag-handle:hover {
		border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
		color: var(--color-foreground);
	}

	.drag-handle:active { cursor: grabbing; }

	.drag-handle:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-accent) 60%, transparent);
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.link-row { transition: none; }
	}
</style>
