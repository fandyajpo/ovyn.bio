<script lang="ts">
	import Card from '#lib/components/ui/Card.svelte';

	const updated = '2 November 2026';

	type Section = {
		title: string;
		list?: string[];
		paragraphs?: string[];
	};

	const sections: Section[] = [
		{
			title: '1. What we collect',
			list: [
				'Account identity: your email address and password (hashed) when you sign in with credentials, or your provider user id, username, display name, avatar and, when the provider shares it, your email when you sign in with Discord or Google.',
				'Profile details you create: username, display name, bio, theme, visibility and social links.',
				'Media you upload: avatar, banner, wallpaper, audio, cursor and cosmetic artwork, stored in object storage.',
				'Purchase records for cosmetics and Premium, including order amounts, payment status and the DOKU reference. Card and bank details never reach ovyn.',
				'Reward activity such as daily check-ins, streaks, points and referrals.'
			]
		},
		{
			title: '2. Profile analytics',
			list: [
				'We count signed-in visits to a public profile once per visitor per UTC day, for the last 30 days.',
				'We do not store IP addresses or user agents for this feature. Visitors are shown to the profile owner only when the visitor\'s own profile is public.'
			]
		},
		{
			title: '3. How we use it',
			list: [
				'To sign you in, publish your page, deliver the features you use and keep the service secure.',
				'To process payments, grant cosmetics and Premium access, and keep purchase history accurate.',
				'To show you your own analytics, rewards and plan status.',
				'To send notifications you explicitly enable on a device. Push delivery is device specific and can be turned off at any time.'
			]
		},
		{
			title: '4. Who else sees it',
			list: [
				'Discord or Google, when you choose to sign in with them. Password sign-ins reach no third party.',
				'DOKU, to create and confirm your payment.',
				'Neon, for the database and object storage, and Vercel, for hosting. Both act as infrastructure providers for ovyn.',
				'Anyone you share a public profile with. Private profiles hide their content, media and links from visitors.'
			]
		},
		{
			title: '5. Stored on your device',
			list: [
				'A theme preference under the local storage key ovyn-theme.',
				'Notification permission and category preferences for the browser you are using.',
				'A service worker cache so the app can load and show an offline page.'
			]
		},
		{
			title: '6. Retention',
			list: [
				'Account and profile data stay while your account exists.',
				'Uploaded media is removed when you replace it, when the profile no longer references it or when your account is deleted.',
				'Order and payment records are kept as long as needed for accounting, tax and dispute handling.'
			]
		},
		{
			title: '7. Your choices',
			list: [
				'Edit or remove your profile details, links, media and visibility at any time from your account.',
				'Ask us to export or delete your account and its content.',
				'Turn notifications off per device, and clear the theme preference by clearing site data.'
			]
		},
		{
			title: '8. Children',
			paragraphs: [
				'ovyn is not intended for children under 13, or under the minimum age required where they live. If we learn that a child below that age created an account, we will close it.'
			]
		},
		{
			title: '9. Changes and contact',
			paragraphs: [
				'We may update this policy as the product changes. Significant updates will be announced in the app.',
				'Privacy questions and deletion requests can be sent to hello@ovyn.me.'
			]
		}
	];
</script>

<svelte:head>
	<title>Privacy Policy - ovyn</title>
	<meta name="description" content="What ovyn collects, how it is used, who it is shared with and the choices you have." />
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-7 py-6">
	<header class="flex flex-col gap-3">
		<span class="sticker sticker--lilac w-fit">PRIVACY POLICY</span>
		<h1 class="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">What ovyn knows, and what it does not.</h1>
		<p class="max-w-2xl text-sm leading-7 text-neutral-400">
			A profile platform needs some data to work. This page lists what we store, why, who processes it, and how you can take it back.
		</p>
		<p class="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-600">Last updated {updated}</p>
	</header>

	{#each sections as section (section.title)}
		<Card class="p-6 sm:p-7">
			<h2 class="font-[family-name:var(--font-display)] text-lg font-semibold">{section.title}</h2>
			{#if section.list}
				<ul class="mt-3 flex flex-col gap-2.5">
					{#each section.list as item}
						<li class="flex gap-2.5 text-sm leading-7 text-neutral-400">
							<span class="mt-2 size-1.5 shrink-0 rounded-full bg-lime-300/70" aria-hidden="true"></span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>
			{/if}
			{#if section.paragraphs}
				<div class="mt-3 flex flex-col gap-3">
					{#each section.paragraphs as paragraph}
						<p class="text-sm leading-7 text-neutral-400">{paragraph}</p>
					{/each}
				</div>
			{/if}
		</Card>
	{/each}

	<p class="text-xs leading-6 text-neutral-600">
		This page explains our current practices and is not legal advice. See also our <a href="/terms" class="text-lime-300 hover:underline">Terms of Service</a>.
	</p>
</div>
