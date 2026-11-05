<script lang="ts">
	import type { PageData } from './$types';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import { formatDate } from '#lib/utils';

	type PlanForm = { error?: string; ok?: string };

	let { data, form }: { data: PageData; form?: PlanForm } = $props();

	function sourceLabel(source: 'override' | 'purchase' | 'free') {
		if (source === 'override') return 'Admin override';
		if (source === 'purchase') return 'Purchase';
		return 'Free';
	}
</script>

<svelte:head>
	<title>Plans - ovyn admin</title>
</svelte:head>

<div class="mx-auto flex max-w-6xl flex-col gap-7">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<span class="sticker sticker--lilac">PLANS</span>
			<h1 class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">Plan switcher</h1>
			<p class="mt-1 max-w-2xl text-neutral-400">Move an account between Free and Premium without a payment. An override always wins over purchases; clear it to fall back to what the account actually bought.</p>
		</div>
		<form method="GET" class="w-full sm:w-72">
			<Input name="q" label="Search accounts" value={data.query} placeholder="name, email or @username" />
		</form>
	</header>

	{#if data.needsMigration}
		<p class="rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-200" role="alert">
			The plan_overrides table is missing. Run <code class="font-mono">pnpm run db:migrate</code>, then reload this page.
		</p>
	{/if}

	{#if form?.error}<p class="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300" role="alert">{form.error}</p>{/if}
	{#if form?.ok}<p class="rounded-xl border border-lime-300/40 bg-lime-300/10 px-4 py-3 text-sm text-lime-200" role="status">{form.ok}</p>{/if}

	{#if data.users.length === 0}
		<Card class="p-10 text-center">
			<p class="font-medium text-neutral-200">No accounts found</p>
			<p class="mt-1 text-sm text-neutral-500">{data.query ? 'Try a different search.' : 'Accounts appear here after their first sign-in.'}</p>
		</Card>
	{:else}
		<Card class="overflow-hidden">
			<div class="grid gap-3 p-3 lg:hidden">
				{#each data.users as row (row.id)}
					<article class="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<h2 class="truncate font-medium text-neutral-100">{row.displayName || row.name}</h2>
								<p class="mt-1 truncate text-xs text-neutral-500">{row.slug ? `@${row.slug}` : row.email || 'No public page'}</p>
							</div>
							<Badge tone={row.effectiveTier === 'premium' ? 'lilac' : 'neutral'} size="xs">{row.effectiveTier}</Badge>
						</div>
						<p class="mt-3 text-xs text-neutral-500">{sourceLabel(row.source)}{#if row.overrideUpdatedAt} · {formatDate(row.overrideUpdatedAt)}{/if}</p>

						<form method="POST" action="?/setPlan" class="plan-form mt-4 border-t border-neutral-800 pt-3">
							<input type="hidden" name="userId" value={row.id} />
							<input name="note" maxlength={200} placeholder="Note (optional)" class="plan-note" value={row.overrideNote ?? ''} />
							<div class="plan-buttons">
								<button type="submit" name="tier" value="premium" class="plan-action" disabled={row.overrideTier === 'premium'}>Premium</button>
								<button type="submit" name="tier" value="free" class="plan-action" disabled={row.overrideTier === 'free'}>Free</button>
								<button type="submit" name="tier" value="default" class="plan-action plan-action--ghost" disabled={!row.overrideTier}>Use purchases</button>
							</div>
						</form>

						<form method="POST" action="?/setStatus" class="plan-buttons mt-2">
							<input type="hidden" name="userId" value={row.id} />
							{#if row.status === 'suspended'}
								<button type="submit" name="status" value="active" class="plan-action">Restore account</button>
							{:else}
								<button type="submit" name="status" value="suspended" class="plan-action plan-action--danger">Suspend account</button>
							{/if}
						</form>
					</article>
				{/each}
			</div>

			<div class="hidden overflow-x-auto lg:block">
				<table class="w-full min-w-[58rem] text-left text-sm">
					<thead class="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
						<tr>
							<th scope="col" class="px-5 py-3">Account</th>
							<th scope="col" class="px-5 py-3">Plan</th>
							<th scope="col" class="px-5 py-3">Source</th>
							<th scope="col" class="px-5 py-3">Change plan</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-neutral-800">
						{#each data.users as row (row.id)}
							<tr>
								<td class="px-5 py-3 align-top">
									<span class="block font-medium text-neutral-100">{row.displayName || row.name}</span>
									<span class="mt-0.5 block text-xs text-neutral-500">{row.slug ? `@${row.slug}` : 'No public page'}{#if row.email} · {row.email}{/if}</span>
									{#if row.status === 'suspended'}<span class="mt-1 inline-block rounded-full border border-red-900/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-red-300">suspended</span>{/if}
								</td>
								<td class="px-5 py-3 align-top"><Badge tone={row.effectiveTier === 'premium' ? 'lilac' : 'neutral'} size="xs">{row.effectiveTier}</Badge></td>
								<td class="px-5 py-3 align-top text-neutral-400">
									{sourceLabel(row.source)}
									{#if row.overrideUpdatedAt}<span class="mt-0.5 block text-[11px] text-neutral-600">{formatDate(row.overrideUpdatedAt)}</span>{/if}
								</td>
								<td class="px-5 py-3 align-top">
									<form method="POST" action="?/setPlan" class="plan-form">
										<input type="hidden" name="userId" value={row.id} />
										<input name="note" maxlength={200} placeholder="Note (optional)" class="plan-note" value={row.overrideNote ?? ''} />
										<div class="plan-buttons">
											<button type="submit" name="tier" value="premium" class="plan-action" disabled={row.overrideTier === 'premium'}>Premium</button>
											<button type="submit" name="tier" value="free" class="plan-action" disabled={row.overrideTier === 'free'}>Free</button>
											<button type="submit" name="tier" value="default" class="plan-action plan-action--ghost" disabled={!row.overrideTier}>Use purchases</button>
										</div>
									</form>
									<form method="POST" action="?/setStatus" class="plan-buttons mt-2">
										<input type="hidden" name="userId" value={row.id} />
										{#if row.status === 'suspended'}
											<button type="submit" name="status" value="active" class="plan-action">Restore account</button>
										{:else}
											<button type="submit" name="status" value="suspended" class="plan-action plan-action--danger">Suspend account</button>
										{/if}
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>
	{/if}
</div>

<style>
	.plan-form {
		display: grid;
		gap: 0.45rem;
		min-width: 17rem;
	}

	.plan-note {
		width: 100%;
		border: 1px solid var(--color-divider);
		border-radius: 0.6rem;
		background: color-mix(in srgb, var(--color-background) 70%, transparent);
		padding: 0.45rem 0.6rem;
		color: var(--color-foreground);
		font: inherit;
		font-size: 0.78rem;
	}

	.plan-note:focus {
		border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
		outline: none;
		box-shadow: 0 0 0 3px var(--color-accent-soft);
	}

	.plan-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.plan-action {
		min-height: 2.2rem;
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 88%, transparent);
		padding: 0.35rem 0.7rem;
		color: var(--color-foreground);
		font: inherit;
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
		transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
	}

	.plan-action:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
		background: var(--color-accent-soft);
	}

	.plan-action:disabled {
		cursor: not-allowed;
		color: var(--color-muted);
		border-color: var(--color-divider);
		background: transparent;
	}

	.plan-action--ghost {
		background: transparent;
		color: var(--color-muted);
	}

	.plan-action--danger {
		border-color: rgba(248, 113, 113, 0.4);
		color: #fca5a5;
	}

	.plan-action--danger:hover:not(:disabled) {
		border-color: #f87171;
		background: rgba(127, 29, 29, 0.25);
		color: #fecaca;
	}

	@media (prefers-reduced-motion: reduce) {
		.plan-action { transition: none; }
	}
</style>
