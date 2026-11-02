<script lang="ts">
	import type { LayoutData } from './$types';
	import WorkspaceSidebar from '#lib/components/WorkspaceSidebar.svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<div class="workspace-shell grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-7">
	<WorkspaceSidebar profileSlug={data.profileSlug} planTier={data.currentPlan.tier} />
	<div class="min-w-0">{@render children()}</div>
</div>
