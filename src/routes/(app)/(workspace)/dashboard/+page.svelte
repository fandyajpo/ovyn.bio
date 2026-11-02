<script lang="ts">
	import type { PageData } from './$types';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { formatDate, formatIdr } from '#lib/utils';

	let { data, form }: { data: PageData; form?: { error?: string; checkin?: { alreadyCheckedIn: boolean; points: number; streakCount: number; pointsEarned: number } } } = $props();
	let referralCopied = $state(false);

	async function copyReferralLink() {
		try {
			await navigator.clipboard.writeText(data.referralUrl);
			referralCopied = true;
		} catch {
			referralCopied = false;
		}
	}
</script>

<svelte:head>
	<title>Dashboard - ovyn</title>
</svelte:head>

<div class="flex flex-col gap-8">
	<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
		<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">
			Hey, {data.profile.displayName || data.profile.slug}
		</h1>
		<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
			<Button href="/shop" variant="ghost" class="w-full sm:w-auto">Explore the shop</Button>
			<Button href="/customize" variant="secondary" class="w-full sm:w-auto">Customize page</Button>
		</div>
	</div>

	<div class="responsive-grid-container">
		<div class="adaptive-metrics grid gap-4">
		<Card class="p-5">
			<p class="font-mono text-xs uppercase tracking-wider text-neutral-500">Your identity</p>
			<div class="mt-3 flex items-center gap-3">
				<Avatar name={data.profile.displayName || data.profile.slug} src={data.avatarUrl} size="md" />
				<div>
					<a href="/{data.profile.slug}" class="font-medium text-lime-300 hover:underline">
						ovyn.bio/{data.profile.slug}
					</a>
					<p class="font-mono text-xs text-neutral-500">
						{data.profile.visibility === 'public' ? 'Public profile' : 'Private profile'}
					</p>
				</div>
			</div>
		</Card>

		<Card class="p-5">
			<p class="font-mono text-xs uppercase tracking-wider text-neutral-500">Your circle</p>
			{#if data.guild}
				<a href="/guild" class="mt-3 block font-medium text-lime-300 hover:underline">{data.guild.name}</a>
				<p class="font-mono text-xs text-neutral-500">Joined {formatDate(data.membership?.joinedAt ?? data.guild.createdAt)}</p>
			{:else}
				<p class="mt-3 text-sm text-neutral-400">You're not in a circle yet.</p>
				<div class="mt-3 flex flex-col gap-2 sm:flex-row">
					<Button href="/discover" variant="secondary" class="w-full sm:w-auto">Discover</Button>
					<Button href="/guild/create" class="w-full sm:w-auto">Create one</Button>
				</div>
			{/if}
		</Card>

		<Card class="p-5">
			<p class="font-mono text-xs uppercase tracking-wider text-neutral-500">Billing</p>
			{#if data.pendingOrder}
				<a href="/checkout/{data.pendingOrder.id}" class="mt-3 block font-medium text-amber-300 hover:underline">
					Pending payment: {formatIdr(data.pendingOrder.amount)}
				</a>
			{:else}
				<p class="mt-3 text-sm text-neutral-400">No pending payments.</p>
				<Button href="/upgrade" variant="secondary" class="mt-3">Plans &amp; billing</Button>
			{/if}
		</Card>
		</div>
	</div>

	<div class="responsive-grid-container">
		<div class="adaptive-metrics grid gap-4">
		<Card class="p-5">
			<p class="font-mono text-xs uppercase tracking-wider text-neutral-500">Daily check-in</p>
			<p class="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold">{data.rewards.streakCount} day streak</p>
			<p class="mt-1 text-sm text-neutral-400">{data.rewards.points} ovyn points · +{data.rewardValues.dailyCheckin} daily, +{data.rewardValues.weeklyStreakBonus} every 7-day streak</p>
			{#if form?.checkin}
				<p class="mt-2 text-sm text-lime-300">
					{form.checkin.alreadyCheckedIn ? 'Already checked in today.' : `Checked in! +${form.checkin.pointsEarned} points.`}
				</p>
			{:else if data.rewards.checkedInToday}
				<p class="mt-2 text-sm text-lime-300">You're checked in for today. Come back tomorrow.</p>
			{:else}
				<form method="POST" action="?/checkin" class="mt-3">
					<Button type="submit">Check in</Button>
				</form>
			{/if}
		</Card>

		<Card class="p-5">
			<p class="font-mono text-xs uppercase tracking-wider text-neutral-500">Profile views · 30 days</p>
			<p class="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold">{data.analytics.views} views</p>
			<p class="mt-1 text-sm text-neutral-400">{data.analytics.uniqueVisitors} unique signed-in visitors</p>
			<a href="/account/analytics" class="mt-3 inline-block text-sm text-lime-300 hover:underline">View analytics</a>
		</Card>

		<Card class="p-5">
			<p class="font-mono text-xs uppercase tracking-wider text-neutral-500">Invite friends</p>
			<p class="mt-2 text-sm text-neutral-400">They earn {data.rewardValues.referral} points after their first check-in; you earn the same.</p>
			<p class="mt-2 text-xs text-neutral-500">
				{data.referralSummary.rewarded} rewarded · {data.referralSummary.pending} awaiting first check-in
			</p>
			<div class="mt-3 flex flex-col gap-2 sm:flex-row">
				<input readonly value={data.referralUrl} class="min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs text-neutral-300" aria-label="Your referral link" />
				<Button variant="secondary" class="w-full sm:w-auto" onclick={copyReferralLink}>{referralCopied ? 'Copied' : 'Copy'}</Button>
			</div>
		</Card>
		</div>
	</div>

	{#if form?.error}
		<p class="text-sm text-red-400" role="alert">{form.error}</p>
	{/if}

	{#if data.invitations.length > 0}
		<Card class="p-5">
			<h2 class="font-medium text-neutral-200">Circle invitations</h2>
			<ul class="mt-3 flex flex-col gap-2">
				{#each data.invitations as inv (inv.invitation.id)}
					<li class="flex flex-col items-start gap-2 rounded-lg bg-neutral-800/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
						<span>
							Invited to <a href="/guild/{inv.guild.slug}" class="text-lime-300 hover:underline">{inv.guild.name}</a>
							by {inv.inviterName ?? 'a member'}
						</span>
						<a href="/guild/invitations" class="text-lime-300 hover:underline">Review</a>
					</li>
				{/each}
			</ul>
		</Card>
	{/if}
</div>
