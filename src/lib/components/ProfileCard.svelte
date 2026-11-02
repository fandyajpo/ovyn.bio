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

<Card class="collage-card collage-card--pink overflow-hidden">
	<a href="/{slug}" class="group block p-5 transition-colors hover:bg-white/[0.02]">
		<div class="mb-5 flex items-center justify-between gap-3">
			<span class="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">OVYN / MEMBER CARD</span>
			<span class="sticker sticker--pink">SPOTLIGHT</span>
		</div>
		<div class="flex items-center gap-4">
			<div class="relative shrink-0">
				<Avatar name={displayName || slug} src={avatarUrl} size="md" />
				<span class="absolute -bottom-2 -right-2 grid size-6 place-items-center rounded-full border-2 border-[#111210] bg-lime-300 font-mono text-[10px] font-bold text-neutral-950">O</span>
			</div>
			<div class="min-w-0">
				<p class="truncate font-[family-name:var(--font-display)] text-lg font-bold text-neutral-100">{displayName || slug}</p>
				<p class="font-mono text-xs text-lime-300">@{slug}</p>
			</div>
		</div>
		{#if bio}<p class="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-neutral-400">{bio}</p>{:else}<p class="mt-4 min-h-10 font-mono text-xs uppercase tracking-wider text-neutral-600">No bio, all aura.</p>{/if}
		<div class="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
			<span class="font-mono text-[10px] uppercase tracking-widest text-neutral-600">Member since {formatDate(createdAt)}</span>
			<span class="font-mono text-xs font-bold text-neutral-200 group-hover:text-lime-300">VIEW <span aria-hidden="true">↗</span></span>
		</div>
	</a>
</Card>
