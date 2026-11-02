<script lang="ts">
	import Card from '#lib/components/ui/Card.svelte';
	import Button from '#lib/components/ui/Button.svelte';

	const topics = [
		{
			title: 'Your account and profile',
				body: 'Sign in with Discord or Google. Your OVYN display name, unique username, bio and avatar are editable independently of your sign-in identity.',
				link: '/account/settings',
				label: 'Account settings'
		},
		{
			title: 'Customize your page',
				body: 'Choose colors and a background, add optional audio, and unlock custom cursor effects and profile layouts with Premium.'
				link: '/customize',
				label: 'Open customization'
		},
		{
			title: 'Sharing and links',
				body: 'Your public page is ovyn.bio/your-username. Links you add are shown to visitors of your public profile.',
				link: '/links',
				label: 'Manage links'
		},
		{
			title: 'Plans and payments',
				body: 'Free is available forever. Premium is a one-time Rp 100.000 payment for lifetime access, with no renewals.',
				link: '/upgrade',
				label: 'View plans'
		}
	];
</script>

<svelte:head>
	<title>Help center — OVYN</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<span class="sticker sticker--blue">GOOD TO KNOW</span>
		<h1 class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">Help center</h1>
		<p class="mt-1 text-neutral-400">Quick answers for making your OVYN corner yours.</p>
	</div>
	<div class="grid gap-4 md:grid-cols-2">
		{#each topics as topic (topic.title)}
			<Card class="flex flex-col gap-3 p-5">
				<h2 class="font-[family-name:var(--font-display)] text-xl font-semibold">{topic.title}</h2>
				<p class="flex-1 text-sm leading-6 text-neutral-400">{topic.body}</p>
				<Button href={topic.link} variant="secondary" class="w-fit">{topic.label}</Button>
			</Card>
		{/each}
	</div>
	<p class="text-xs text-neutral-600">If something looks wrong, check your account settings and payment history before trying again.</p>
</div>
