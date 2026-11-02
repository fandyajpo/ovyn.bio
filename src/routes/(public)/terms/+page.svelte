<script lang="ts">
	import Card from '#lib/components/ui/Card.svelte';

	const updated = '2 November 2026';

	const sections = [
		{
			title: '1. Agreement',
			paragraphs: [
				'By creating an account or using ovyn you agree to these terms. If you do not agree, please do not use the platform.',
				'ovyn is a place to publish a personal page, share links, collect profile cosmetics and find communities. We may add or remove features over time.'
			]
		},
		{
			title: '2. Your account',
			paragraphs: [
				'You sign in with Discord or Google. You are responsible for keeping that account secure, and for everything done through your ovyn account.',
				'You must be at least 13 years old, or the minimum age required where you live, to use ovyn.',
				'Your ovyn display name, username and bio are yours to edit. Usernames are unique, cannot impersonate another person or a member of the ovyn team, and cannot use names reserved for platform routes.'
			]
		},
		{
			title: '3. Your content',
			paragraphs: [
				'You keep ownership of the text, images, audio and other material you upload. By publishing it you give ovyn a licence to host, process and display it so the service can work.',
				'You are responsible for having the right to upload everything you upload. Do not upload content that is illegal, hateful, harassing, sexually exploitative, malicious or that infringes someone else\'s rights.',
				'Profiles can be public or private. A public profile, its links, badges, wallpapers, audio and cursor are visible to anyone with the address.'
			]
		},
		{
			title: '4. Acceptable use',
			paragraphs: [
				'Do not attempt to disrupt the service, access another person\'s account, scrape personal data at scale, bypass rate limits or payment checks, or use ovyn to distribute malware or spam.',
				'We may remove content, limit features or suspend an account that breaks these terms or puts other people at risk.'
			]
		},
		{
			title: '5. Plans, cosmetics and points',
			paragraphs: [
				'Free is the default plan. Premium is Rp 30.000 for 30 days of access. There is no automatic renewal or recurring charge; you renew by paying again from your account.',
				'Cosmetics can be bought once or redeemed with points. Limited drops may have a stock cap or an end date, and stock is reserved while a checkout is pending.',
				'Points are a non-cash reward currency earned through check-ins and referrals. They have no monetary value, cannot be transferred or cashed out, and may be adjusted if a reward is abused.',
				'Purchases are final except where a refund is required by applicable law. Contact us before opening a payment dispute so we can help.'
			]
		},
		{
			title: '6. Payments',
			paragraphs: [
				'Payments are processed by DOKU through a virtual account. Amounts are set on the server from the published catalog, and access is activated only after the payment is confirmed.',
				'Taxes, bank fees and currency conversion are your responsibility unless stated otherwise.'
			]
		},
		{
			title: '7. Availability and changes',
			paragraphs: [
				'We work to keep ovyn available, but the service is provided as is and may be interrupted for maintenance, security or reasons outside our control.',
				'We may update these terms. When a change is significant we will announce it in the app or by email where we have one. Continuing to use ovyn after an update means you accept the new terms.'
			]
		},
		{
			title: '8. Ending access',
			paragraphs: [
				'You can stop using ovyn at any time. You may ask us to delete your account and its content.',
				'We may suspend or close an account that breaks these terms, harms other people or creates legal risk for the platform. Where possible we will explain why.'
			]
		},
		{
			title: '9. Contact',
			paragraphs: [
				'Questions about these terms can be sent to hello@ovyn.me.'
			]
		}
	];
</script>

<svelte:head>
	<title>Terms of Service - ovyn</title>
	<meta name="description" content="The rules for using ovyn: accounts, content, plans, cosmetics, payments and acceptable use." />
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-7 py-6">
	<header class="flex flex-col gap-3">
		<span class="sticker sticker--blue w-fit">TERMS OF SERVICE</span>
		<h1 class="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">The deal between you and ovyn.</h1>
		<p class="max-w-2xl text-sm leading-7 text-neutral-400">
			These terms explain what you can expect from ovyn and what we expect from you. They are written to be read, not to hide the important parts.
		</p>
		<p class="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-600">Last updated {updated}</p>
	</header>

	{#each sections as section (section.title)}
		<Card class="p-6 sm:p-7">
			<h2 class="font-[family-name:var(--font-display)] text-lg font-semibold">{section.title}</h2>
			<div class="mt-3 flex flex-col gap-3">
				{#each section.paragraphs as paragraph}
					<p class="text-sm leading-7 text-neutral-400">{paragraph}</p>
				{/each}
			</div>
		</Card>
	{/each}

	<p class="text-xs leading-6 text-neutral-600">
		This page is a plain-language summary of how ovyn operates and is not legal advice. See also our <a href="/privacy" class="text-lime-300 hover:underline">Privacy Policy</a>.
	</p>
</div>
