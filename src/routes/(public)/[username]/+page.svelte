<script lang="ts">
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import CreatureLayer from '#lib/components/CreatureLayer.svelte';
	import LinkProviderIcon from '#lib/components/LinkProviderIcon.svelte';
	import ProfileBadge from '#lib/components/ProfileBadge.svelte';
	import TemplateBlocks from '#lib/components/TemplateBlocks.svelte';
	import { formatDate } from '#lib/utils';

	let { data } = $props();

	const p = $derived.by(() => data.profile);
	const displayName = $derived.by(() => {
		const profile = data.profile;
		return profile.displayName || data.discord?.globalName || data.discord?.username || profile.slug;
	});
	const bannerIsVideo = $derived(data.bannerIsVideo);
	const bannerVideoType = $derived(data.bannerVideoType);

	// SEO: private corners stay out of search engines entirely.
	const SITE_ORIGIN = 'https://ovyn.me';
	const profileUrl = $derived(`${SITE_ORIGIN}/${p.slug}`);
	const ogImage = $derived(!data.private && data.avatarUrl ? data.avatarUrl : null);
	const ogTitle = $derived(`${displayName} (@${p.slug}) - ovyn`);
	const ogDescription = $derived(p.bio || `Find ${displayName} on ovyn.`);
	const jsonLdScript = $derived.by(() => {
		if (data.private) return null;
		// Svelte's parser cannot embed expressions inside a literal <script>
		// element, so the whole tag is built as one string and injected with
		// {@html}. The payload is generated server-side and contains no user
		// input beyond what JSON.stringify escapes.
		const payload = JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'ProfilePage',
			name: `${displayName} (@${p.slug})`,
			url: profileUrl,
			mainEntity: {
				'@type': 'Person',
				name: displayName,
				alternateName: `@${p.slug}`,
				description: p.bio || undefined,
				url: profileUrl
			}
		});
		return `<script type="application/ld+json">${payload}</script>`;
	});
</script>

<svelte:head>
	<title>{displayName} (@{p.slug}) - ovyn</title>
	<meta name="description" content={p.bio || `${displayName}'s space on ovyn.`} />
	{#if data.private}
		<meta name="robots" content="noindex, nofollow" />
	{:else}
		<link rel="canonical" href={profileUrl} />
		<meta property="og:title" content={ogTitle} />
		<meta property="og:description" content={ogDescription} />
		<meta property="og:type" content="profile" />
		<meta property="og:url" content={profileUrl} />
		{#if ogImage}
			<meta property="og:image" content={ogImage} />
			<meta property="og:image:alt" content={displayName} />
		{/if}
		<meta name="twitter:title" content={ogTitle} />
		<meta name="twitter:description" content={ogDescription} />
		{#if ogImage}<meta name="twitter:image" content={ogImage} />{/if}
		{#if jsonLdScript}
			{@html jsonLdScript}
		{/if}
	{/if}
</svelte:head>

{#if data.private}
	<main class="profile-private-state">
		<div class="private-orbit" aria-hidden="true"></div>
		<p class="profile-overline">ovyn / private space</p>
		<h1>This corner is private.</h1>
		<p>The owner has chosen to keep this page to themselves.</p>
	</main>
{:else}
	<article
		class="profile-canvas"
		data-profile-theme={p.theme}
		data-profile-texture={p.backgroundTexture ?? 'none'}
		style={data.cursorUrl ? `cursor: url('${data.cursorUrl}') 0 0, auto` : undefined}
	>
		{#if data.backgroundUrl}
			{#if data.backgroundIsVideo}
				<video autoplay loop muted playsinline preload="metadata" aria-hidden="true" tabindex="-1" class="profile-background {p.backgroundFixed ? 'is-fixed' : ''}">
					<source src={data.backgroundUrl} type={data.backgroundVideoType} />
				</video>
			{:else}
				<img src={data.backgroundUrl} alt="" class="profile-background {p.backgroundFixed ? 'is-fixed' : ''}" />
			{/if}
		{/if}
		{#if data.cosmetics?.wallpaperUrl}
			<img src={data.cosmetics.wallpaperUrl} alt="" class="profile-wallpaper" />
		{/if}
		<div class="profile-atmosphere" aria-hidden="true"></div>
		<CreatureLayer settings={p.creatures.list} />
		<div class="profile-canvas-inner">
			<header class="profile-intro">
				{#if data.bannerUrl}
					{#if bannerIsVideo}
						<video autoplay loop muted playsinline preload="metadata" aria-hidden="true" tabindex="-1" class="profile-cover">
							<source src={data.bannerUrl} type={bannerVideoType} />
						</video>
					{:else}
						<img src={data.bannerUrl} alt="" class="profile-cover" />
					{/if}
				{/if}
				<div class="profile-identity">
					<div class="profile-avatar-wrap">
						<Avatar name={displayName} src={data.avatarUrl} size="xl" />
						{#if data.cosmetics?.frameUrl}<img src={data.cosmetics.frameUrl} alt="" class="profile-avatar-frame" />{/if}
					</div>
					<div class="profile-identity-copy">
						<p class="profile-overline">ovyn / personal space</p>
						<h1>{displayName}{#if data.cosmetics?.badgeUrl}<ProfileBadge label="ovyn profile badge" src={data.cosmetics.badgeUrl} />{/if}{#if data.isPremium}<span class="premium-profile-mark" aria-label="ovyn Premium member">✦</span>{/if}</h1>
						<p class="profile-handle" style={p.usernameColor ? `color: ${p.usernameColor}` : undefined}>@{p.slug}</p>
						{#if data.discord}<p class="profile-discord">Discord · {data.discord.username}</p>{/if}
					</div>
				</div>
			</header>

			{#if p.bio}
				<section class="profile-about" aria-label="About {displayName}">
					<p>{p.bio}</p>
				</section>
			{/if}

			{#if data.audioUrl}
				<audio controls preload="none" src={data.audioUrl} class="profile-audio" aria-label="{displayName}'s profile audio"></audio>
			{/if}

			{#if data.links.length > 0}
				<nav aria-label="{displayName}'s links" class="profile-links">
					{#each data.links as link, index (link.id)}
						<a
							href={link.url}
							target="_blank"
							rel="noopener noreferrer nofollow"
							class="profile-link"
							style={`--i: ${index}`}
						>
							<span class="profile-link-float"><LinkProviderIcon provider={link.provider} size="sm" /></span>
							<span class="profile-link-label">{link.label}</span>
							<span class="profile-link-arrow" aria-hidden="true">↗</span>
						</a>
					{/each}
				</nav>
			{/if}

			{#if p.blocks.length > 0}
				<section aria-label="{displayName}'s page content">
					<TemplateBlocks blocks={p.blocks} />
				</section>
			{/if}

			{#if data.guild}
				<section class="profile-circle" aria-label="Community">
					<p class="profile-overline">THEIR CIRCLE</p>
					<a href="/guild/{data.guild.slug}">{data.guild.name}<span aria-hidden="true">↗</span></a>
				</section>
			{/if}

			<footer class="profile-signoff">
				<p>Here since {formatDate(p.createdAt)}</p>
				<span>ovyn · your identity, out in the world</span>
			</footer>
			{#if data.viewerTracked}<p class="profile-view-note">Signed-in visits may appear in this profile's analytics.</p>{/if}
		</div>
	</article>
{/if}

<style>
	.profile-canvas {
		position: relative;
		isolation: isolate;
		min-height: 100svh;
		overflow: hidden;
		background: var(--color-background);
		color: var(--color-foreground);
	}

	.profile-wallpaper,
	.profile-atmosphere {
		position: absolute;
		z-index: -1;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.profile-background {
		position: absolute;
		z-index: -3;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.3;
		filter: saturate(0.85);
	}

	.profile-background.is-fixed {
		position: fixed;
		height: 100svh;
	}

	.profile-canvas[data-profile-texture='grid'] .profile-atmosphere::after,
	.profile-canvas[data-profile-texture='dots'] .profile-atmosphere::after,
	.profile-canvas[data-profile-texture='waves'] .profile-atmosphere::after {
		position: absolute;
		inset: 0;
		content: '';
		pointer-events: none;
	}

	.profile-canvas[data-profile-texture='grid'] .profile-atmosphere::after {
		background-image:
			linear-gradient(color-mix(in srgb, var(--color-foreground) 7%, transparent) 1px, transparent 1px),
			linear-gradient(90deg, color-mix(in srgb, var(--color-foreground) 7%, transparent) 1px, transparent 1px);
		background-size: 3rem 3rem;
	}

	.profile-canvas[data-profile-texture='dots'] .profile-atmosphere::after {
		background-image: radial-gradient(color-mix(in srgb, var(--color-foreground) 12%, transparent) 1px, transparent 1.4px);
		background-size: 1.1rem 1.1rem;
	}

	.profile-canvas[data-profile-texture='waves'] .profile-atmosphere::after {
		background-image: repeating-radial-gradient(
			circle at 50% 120%,
			transparent 0 2rem,
			color-mix(in srgb, var(--color-accent) 14%, transparent) 2.05rem 2.12rem,
			transparent 2.17rem 4rem
		);
	}

	.profile-wallpaper {
		position: fixed;
		object-fit: cover;
		opacity: 0.18;
		filter: saturate(0.72);
	}

	.profile-atmosphere {
		background:
			radial-gradient(52rem 40rem at 12% 16%, color-mix(in srgb, var(--color-pop-lilac) 16%, transparent), transparent 68%),
			radial-gradient(42rem 30rem at 90% 28%, color-mix(in srgb, var(--color-pop-pink) 10%, transparent), transparent 70%),
			linear-gradient(180deg, color-mix(in srgb, var(--color-background) 48%, transparent), var(--color-background) 88%);
	}

	.profile-canvas-inner {
		position: relative;
		z-index: 1;
		width: min(100%, 76rem);
		min-height: 100svh;
		margin-inline: auto;
		padding: clamp(1.5rem, 6vw, 5.5rem) clamp(1.25rem, 7vw, 7rem) 2.5rem;
	}

	.profile-intro {
		display: flex;
		flex-direction: column;
		gap: clamp(1.75rem, 5vw, 3.5rem);
	}

	.profile-cover {
		width: 100%;
		max-height: 25rem;
		aspect-ratio: 2.7 / 1;
		object-fit: cover;
		border-radius: 1.5rem;
		mask-image: linear-gradient(180deg, #000 58%, transparent 100%);
	}

	.profile-identity {
		display: flex;
		align-items: center;
		gap: clamp(1.25rem, 4vw, 2.5rem);
	}

	.profile-avatar-wrap {
		position: relative;
		flex: 0 0 auto;
		filter: drop-shadow(0 12px 32px rgb(0 0 0 / 18%));
	}

	.profile-avatar-frame {
		position: absolute;
		inset: -0.6rem;
		width: calc(100% + 1.2rem);
		height: calc(100% + 1.2rem);
		object-fit: contain;
		pointer-events: none;
	}

	.profile-identity-copy { min-width: 0; }
	.profile-overline {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		color: var(--color-muted);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.18em;
	}

	.profile-identity-copy h1 {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		margin-top: 0.45rem;
		font-size: clamp(2rem, 6vw, 4rem);
		font-weight: 600;
		letter-spacing: -0.055em;
		line-height: 1.08;
	}

	.profile-handle { margin-top: 0.5rem; color: var(--color-accent); font-size: 1rem; }
	.premium-profile-mark { display: inline-grid; width: 1.5rem; height: 1.5rem; place-items: center; border-radius: 50%; background: var(--color-accent-soft); color: var(--color-accent); font-size: 0.8rem; vertical-align: middle; }
	.profile-discord { margin-top: 0.5rem; color: var(--color-muted); font-size: 0.8rem; }
	.profile-about { max-width: 54rem; margin-top: clamp(2.5rem, 8vw, 6rem); }
	.profile-about p { color: color-mix(in srgb, var(--color-foreground) 82%, var(--color-muted)); font-size: clamp(1.1rem, 2.7vw, 1.65rem); line-height: 1.75; white-space: pre-wrap; }
	.profile-audio { width: min(100%, 28rem); margin-top: 2rem; }

	.profile-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem 1.6rem;
		margin-top: 2rem;
	}

	.profile-links a,
	.profile-circle a {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding-block: 0.55rem;
		color: var(--color-foreground);
		font-size: 0.95rem;
		text-decoration: none;
		transition: color 180ms ease, transform 180ms ease;
	}

	.profile-links a span,
	.profile-circle a span { color: var(--color-accent); }

	.profile-circle a span { color: var(--color-accent); }

	.profile-links .profile-link {
		gap: 0.6rem;
		padding-block: 0.55rem;
		transition:
			color 200ms ease,
			transform 260ms cubic-bezier(0.2, 0.7, 0.2, 1);
	}

	.profile-link-float {
		display: inline-flex;
		flex: 0 0 auto;
		animation: profile-link-float 5.6s ease-in-out infinite;
		animation-delay: calc(var(--i, 0) * 0.32s);
	}

	.profile-link :global(.provider-icon) {
		transition: transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.profile-link-label {
		color: var(--color-foreground);
		transition: color 160ms ease;
	}

	.profile-link-arrow {
		color: var(--color-accent);
		font-size: 0.8em;
		transition: transform 240ms ease;
	}

	@media (hover: hover) and (pointer: fine) {
		.profile-links .profile-link:hover {
			transform: translateY(-2px);
		}

		.profile-link:hover :global(.provider-icon) {
			transform: translateY(-1px) rotate(-6deg) scale(1.08);
		}

		.profile-link:hover .profile-link-arrow { transform: translate(2px, -2px); }
	}

	.profile-link:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-accent) 60%, transparent);
		outline-offset: 2px;
	}

	.profile-link:active :global(.provider-icon) {
		transform: scale(0.92) rotate(3deg);
		transition-duration: 90ms;
	}

	@keyframes profile-link-float {
		0%, 100% { transform: translate3d(0, 0, 0); }
		50% { transform: translateY(-2px); }
	}

	@media (prefers-reduced-motion: reduce) {
		.profile-link-float { animation: none; }
		.profile-link :global(.provider-icon) { transition: none; }
	}
	.profile-links a:hover,
	.profile-circle a:hover { color: var(--color-accent); transform: translateY(-2px); }
	.profile-circle { margin-top: 3rem; }
	.profile-circle a { margin-top: 0.35rem; font-size: 1.25rem; font-weight: 500; }

	.profile-signoff {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.8rem 2rem;
		margin-top: clamp(4rem, 10vw, 8rem);
		color: var(--color-muted);
		font-size: 0.72rem;
	}
	.profile-signoff span { letter-spacing: 0.12em; }
	.profile-view-note { margin-top: 1rem; color: var(--color-muted); font-size: 0.7rem; }

	.profile-private-state {
		position: relative;
		display: grid;
		min-height: 100svh;
		place-content: center;
		justify-items: center;
		gap: 1rem;
		overflow: hidden;
		padding: 2rem;
		text-align: center;
	}
	.profile-private-state h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 600; letter-spacing: -0.05em; }
	.profile-private-state > p:last-child { color: var(--color-muted); }
	.private-orbit { position: absolute; width: min(80vw, 32rem); aspect-ratio: 1; border: 1px solid var(--color-divider); border-radius: 50%; opacity: 0.4; }

	[data-profile-theme='midnight'] .profile-atmosphere { filter: hue-rotate(18deg); }
	[data-profile-theme='bubblegum'] .profile-atmosphere { filter: hue-rotate(-20deg); }
	[data-profile-theme='ocean'] .profile-atmosphere { filter: hue-rotate(48deg); }
	[data-profile-theme='forest'] .profile-atmosphere { filter: hue-rotate(82deg); }

	@media (max-width: 40rem) {
		.profile-canvas-inner { padding-inline: 1.25rem; }
		.profile-identity { align-items: flex-start; }
		.profile-identity-copy h1 { flex-wrap: wrap; }
		.profile-cover { aspect-ratio: 1.7 / 1; border-radius: 1rem; }
		.profile-signoff span { width: 100%; }
	}
</style>
