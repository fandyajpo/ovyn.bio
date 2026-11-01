<script lang="ts">
	import Avatar from './ui/Avatar.svelte';
	import Card from './ui/Card.svelte';
	import { formatDate } from '#lib/utils';

	let {
		slug,
		displayName,
		bio,
		avatarUrl = null,
		createdAt
	}: {
		slug: string;
		displayName: string | null;
		bio: string | null;
		avatarUrl?: string | null;
		createdAt: Date;
	} = $props();
</script>

<Card class="overflow-hidden">
	<a href="/{slug}" class="flex items-start gap-4 p-4 transition-colors hover:bg-neutral-800/30">
		<Avatar name={displayName || slug} src={avatarUrl} size="md" />
		<div class="min-w-0">
			<p class="truncate font-medium text-neutral-100">{displayName || slug}</p>
			<p class="font-mono text-xs text-neutral-500">@{slug}</p>
			{#if bio}
				<p class="mt-1 line-clamp-2 text-sm text-neutral-400">{bio}</p>
			{/if}
			<p class="mt-1 text-xs text-neutral-600">Joined {formatDate(createdAt)}</p>
		</div>
	</a>
</Card>
