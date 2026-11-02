<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { PageData } from './$types';
	import Button from '#lib/components/ui/Button.svelte';
	import LinkProviderIcon from '#lib/components/LinkProviderIcon.svelte';
	import { ONBOARDING_PERSONAS, ONBOARDING_SOURCES } from '#lib/schemas/onboarding';

	let { data, form }: { data: PageData; form?: { error?: string } } = $props();

	let step = $state(0);
	let persona = $state('');
	let foundVia = $state('');
	let sourceQuery = $state('');
	let leaving = $state(false);
	let formEl = $state<HTMLFormElement | undefined>(undefined);

	const steps = ['who you are', 'how you found us', 'welcome'];
	const initial = $derived((data.displayName ?? 'you').trim().charAt(0).toUpperCase() || 'Y');

	const visibleSources = $derived(
		ONBOARDING_SOURCES.filter((source) =>
			source.label.toLowerCase().includes(sourceQuery.trim().toLowerCase())
		)
	);

	const canContinue = $derived(step === 0 ? Boolean(persona) : step === 1 ? Boolean(foundVia) : true);

	function next() {
		if (!canContinue || step >= 2) return;
		step += 1;
	}

	function back() {
		if (leaving || step === 0) return;
		step -= 1;
	}

	function finish(event: SubmitEvent) {
		// Enter inside a step still has to advance rather than post early.
		if (step < 2) {
			event.preventDefault();
			next();
			return;
		}
		if (leaving) return;
		// Let the welcome card animate out before the form posts.
		event.preventDefault();
		leaving = true;
		setTimeout(() => formEl?.requestSubmit(), 620);
	}
</script>

<svelte:head>
	<title>Welcome to ovyn</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="onboarding" class:is-leaving={leaving}>
	<div class="onboarding-glow" aria-hidden="true"></div>

	<header class="onboarding-top">
		<a href="/" class="onboarding-mark">ovyn<span>.</span></a>
		<ol class="onboarding-progress" aria-label="Onboarding progress">
			{#each steps as label, index (label)}
				<li class:is-active={step === index} class:is-done={step > index}>
					<span aria-hidden="true">{step > index ? '✓' : index + 1}</span>
					<em>{label}</em>
				</li>
			{/each}
		</ol>
	</header>

	<form method="POST" bind:this={formEl} onsubmit={finish} class="onboarding-shell">
		<input type="hidden" name="persona" value={persona} />
		<input type="hidden" name="foundVia" value={foundVia} />

		{#if form?.error}
			<p class="onboarding-error" role="alert">{form.error}</p>
		{/if}

		{#if step === 0}
			<section class="onboarding-panel" in:fly={{ y: 22, duration: 320 }}>
				<p class="onboarding-overline">step one</p>
				<h1>Who are you, really?</h1>
				<p class="onboarding-lead">Pick the one that sounds most like you. It only shapes your start.</p>

				<div class="persona-grid">
					{#each ONBOARDING_PERSONAS as option (option.value)}
						<label class="persona-card" class:is-selected={persona === option.value}>
							<input
								type="radio"
								name="personaChoice"
								value={option.value}
								checked={persona === option.value}
								onchange={() => (persona = option.value)}
							/>
							<span class="persona-icon" aria-hidden="true">{option.icon}</span>
							<span class="persona-copy">
								<strong>{option.label}</strong>
								<span>{option.description}</span>
							</span>
						</label>
					{/each}
				</div>
			</section>
		{:else if step === 1}
			<section class="onboarding-panel" in:fly={{ y: 22, duration: 320 }}>
				<p class="onboarding-overline">step two</p>
				<h1>How did you find us?</h1>
				<p class="onboarding-lead">Pick the place you first saw ovyn. There is no wrong answer.</p>

				<input
					class="source-search"
					bind:value={sourceQuery}
					placeholder="find a platform"
					aria-label="Filter platforms"
					autocomplete="off"
					spellcheck="false"
				/>

				<div class="source-grid">
					{#each visibleSources as source (source.value)}
						<label class="source-card" class:is-selected={foundVia === source.value}>
							<input
								type="radio"
								name="sourceChoice"
								value={source.value}
								checked={foundVia === source.value}
								onchange={() => (foundVia = source.value)}
							/>
							{#if source.provider}
								<LinkProviderIcon provider={source.provider} size="sm" />
							{:else}
								<span class="source-glyph" aria-hidden="true">✧</span>
							{/if}
							<span>{source.label}</span>
						</label>
					{/each}
				</div>
			</section>
		{:else}
			<section class="onboarding-panel onboarding-welcome" in:fly={{ y: 26, duration: 420 }}>
				<span class="welcome-avatar" aria-hidden="true">{initial}</span>
				<p class="onboarding-overline">all set</p>
				<h1>Welcome in, {data.displayName ?? 'you'}.</h1>
				<p class="onboarding-lead">
					Your corner is ready at <strong>ovyn.me/{data.slug}</strong>. Add a picture, a line about you and a few
					links whenever you like.
				</p>
			</section>
		{/if}

		<footer class="onboarding-actions">
			{#if step > 0}
				<button type="button" class="onboarding-back" onclick={back} disabled={leaving}>Back</button>
			{/if}
			{#if step < 2}
				<Button type="button" onclick={next} disabled={!canContinue}>Continue</Button>
			{:else}
				<Button type="submit" loading={leaving}>Enter ovyn</Button>
			{/if}
		</footer>
	</form>
</div>

<style>
	.onboarding {
		position: relative;
		display: flex;
		min-height: 100svh;
		flex-direction: column;
		overflow: hidden;
		padding: max(1.25rem, env(safe-area-inset-top)) max(1.25rem, env(safe-area-inset-right))
			max(1.5rem, env(safe-area-inset-bottom)) max(1.25rem, env(safe-area-inset-left));
		background: var(--color-background);
		transition: transform 620ms cubic-bezier(0.2, 0.7, 0.2, 1), opacity 620ms ease;
	}

	.onboarding.is-leaving {
		transform: scale(1.05);
		opacity: 0;
	}

	.onboarding-glow {
		position: absolute;
		inset: -20% -10% auto -10%;
		height: 70vh;
		background:
			radial-gradient(40rem 26rem at 12% 0%, color-mix(in srgb, var(--color-accent) 16%, transparent), transparent 64%),
			radial-gradient(38rem 24rem at 92% 10%, color-mix(in srgb, var(--color-pop-lilac) 18%, transparent), transparent 66%);
		pointer-events: none;
	}

	.onboarding-top {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.onboarding-mark {
		color: var(--color-foreground);
		font-family: var(--font-display);
		font-size: 1.35rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		text-decoration: none;
	}

	.onboarding-mark span { color: var(--color-accent); }

	.onboarding-progress {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		list-style: none;
	}

	.onboarding-progress li {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		padding: 0.25rem 0.7rem;
		color: var(--color-muted);
		font-size: 0.66rem;
	}

	.onboarding-progress span {
		display: grid;
		width: 1.15rem;
		height: 1.15rem;
		place-items: center;
		border-radius: 50%;
		background: color-mix(in srgb, var(--color-foreground) 8%, transparent);
		font-family: var(--font-mono);
		font-size: 0.6rem;
	}

	.onboarding-progress em { font-style: normal; }

	.onboarding-progress li.is-active {
		border-color: color-mix(in srgb, var(--color-accent) 46%, transparent);
		background: var(--color-accent-soft);
		color: var(--color-accent);
	}

	.onboarding-progress li.is-done { color: var(--color-foreground); }

	.onboarding-shell {
		position: relative;
		display: flex;
		width: 100%;
		max-width: 56rem;
		flex: 1;
		flex-direction: column;
		gap: 1.5rem;
		margin: 0 auto;
		padding-block: clamp(2rem, 8vh, 5rem) 0;
	}

	.onboarding-panel { display: flex; flex-direction: column; gap: 0.85rem; }

	.onboarding-overline {
		color: var(--color-accent);
		font-family: var(--font-mono);
		font-size: 0.66rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
	}

	.onboarding-panel h1 {
		font-size: clamp(2rem, 5.4vw, 3.4rem);
		font-weight: 600;
		letter-spacing: -0.05em;
		line-height: 1.06;
	}

	.onboarding-lead {
		max-width: 40rem;
		color: var(--color-muted);
		font-size: 0.95rem;
		line-height: 1.7;
	}

	.persona-grid {
		display: grid;
		gap: 0.6rem;
		margin-top: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
	}

	.persona-card,
	.source-card {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.7rem;
		border: 1px solid var(--color-divider);
		border-radius: 1.15rem;
		background: color-mix(in srgb, var(--color-surface) 78%, transparent);
		padding: 0.85rem 1rem;
		cursor: pointer;
		transition: border-color 180ms ease, background-color 180ms ease, transform 180ms ease;
	}

	.persona-card input,
	.source-card input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
	}

	.persona-card:hover,
	.source-card:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--color-accent) 34%, transparent); }

	.persona-card.is-selected,
	.source-card.is-selected {
		border-color: color-mix(in srgb, var(--color-accent) 62%, transparent);
		background: var(--color-accent-soft);
	}

	.persona-icon {
		display: grid;
		width: 2.25rem;
		height: 2.25rem;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--color-accent) 16%, var(--color-surface));
		color: var(--color-accent);
		font-size: 1rem;
	}

	.persona-copy { display: grid; gap: 0.15rem; }
	.persona-copy strong { color: var(--color-foreground); font-size: 0.92rem; font-weight: 600; }
	.persona-copy span { color: var(--color-muted); font-size: 0.76rem; line-height: 1.45; }

	.source-search {
		width: 100%;
		max-width: 22rem;
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 78%, transparent);
		padding: 0.55rem 0.95rem;
		color: var(--color-foreground);
		font: inherit;
		font-size: 0.82rem;
	}

	.source-search:focus {
		border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
		outline: none;
		box-shadow: 0 0 0 3px var(--color-accent-soft);
	}

	.source-grid {
		display: grid;
		gap: 0.45rem;
		margin-top: 0.75rem;
		max-height: min(46vh, 26rem);
		overflow-y: auto;
		padding-right: 0.25rem;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
	}

	.source-card {
		padding: 0.5rem 0.7rem;
		font-size: 0.8rem;
		color: var(--color-foreground);
	}

	.source-glyph {
		display: grid;
		width: 1.75rem;
		height: 1.75rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 0.55rem;
		color: var(--color-accent);
		font-size: 0.8rem;
	}

	.onboarding-welcome {
		align-items: flex-start;
		gap: 1rem;
		padding-top: clamp(2rem, 10vh, 6rem);
	}

	.welcome-avatar {
		display: grid;
		width: 4.5rem;
		height: 4.5rem;
		place-items: center;
		border-radius: 999px;
		background: linear-gradient(140deg, var(--color-accent), color-mix(in srgb, var(--color-pop-lilac) 60%, var(--color-accent)));
		color: var(--color-on-accent);
		font-family: var(--font-display);
		font-size: 1.7rem;
		font-weight: 700;
	}

	.onboarding-lead strong { color: var(--color-accent); font-weight: 600; }

	.onboarding-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		margin-top: auto;
		padding-top: 1.5rem;
	}

	.onboarding-back {
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: transparent;
		padding: 0.6rem 1.1rem;
		color: var(--color-muted);
		font: inherit;
		font-size: 0.82rem;
		cursor: pointer;
		transition: color 160ms ease, border-color 160ms ease;
	}

	.onboarding-back:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--color-accent) 36%, transparent);
		color: var(--color-foreground);
	}

	.onboarding-back:disabled { cursor: progress; }

	.onboarding-error {
		border: 1px solid color-mix(in srgb, var(--color-danger) 45%, transparent);
		border-radius: 0.9rem;
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
		padding: 0.6rem 0.9rem;
		color: var(--color-danger);
		font-size: 0.82rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.onboarding,
		.persona-card,
		.source-card,
		.onboarding-back { transition: none; }
		.onboarding.is-leaving { transform: none; }
	}
</style>
