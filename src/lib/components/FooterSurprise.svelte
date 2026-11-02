<script lang="ts">
	const NOTES = [
		'Your profile is allowed to be a little weird. That is the point.',
		'You made it to the bottom. Take the tiny win.',
		'Send your page to the group chat. Let them rate the vibe.',
		'Your circle is one good link away.'
	] as const;

	let shown = $state(false);
	let opened = $state(false);
	let note = $state('');

	function observeFooter(anchor: HTMLDivElement) {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const reveal = () => {
			if (Math.random() > 0.68) return;
			timer = window.setTimeout(() => {
				const index = Math.floor(Math.random() * NOTES.length);
				note = NOTES[index] ?? NOTES[0];
				shown = true;
			}, 450 + Math.floor(Math.random() * 1500));
		};

		if (!('IntersectionObserver' in window)) {
			reveal();
			return () => timer && clearTimeout(timer);
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				observer.disconnect();
				reveal();
			},
			{ threshold: 0.45 }
		);
		observer.observe(anchor);
		return () => {
			observer.disconnect();
			if (timer) clearTimeout(timer);
		};
	}
</script>

<div {@attach observeFooter} class="footer-surprise-slot">
	{#if shown}
		<div class="footer-surprise" aria-live="polite">
			<span class="sticker sticker--pink">A TINY SURPRISE</span>
			<button
				type="button"
				class="surprise-button"
				aria-expanded={opened}
				aria-label={opened ? 'Close the surprise note' : 'Open the surprise note'}
				onclick={() => (opened = !opened)}
			>
				<span class="surprise-box" aria-hidden="true">
					<span class="surprise-box__lid"></span>
					<span class="surprise-box__body"></span>
					<span class="surprise-box__ribbon"></span>
				</span>
				<span class="font-mono text-[10px] font-bold uppercase tracking-widest">{opened ? 'CLOSE NOTE' : 'OPEN NOTE'}</span>
			</button>
			{#if opened}
				<p class="surprise-note">{note}</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.footer-surprise-slot {
		min-height: 2rem;
	}

	.footer-surprise {
		display: flex;
		max-width: 17rem;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		border: 1px solid rgb(255 255 255 / 12%);
		border-radius: 1.5rem;
		background: rgb(27 29 25 / 80%);
		padding: 1rem;
		box-shadow: 5px 5px 0 rgb(255 120 168 / 16%);
		animation: surprise-pop 460ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}

	.surprise-button {
		display: flex;
		min-height: 5.5rem;
		width: 100%;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		border-radius: 1rem;
		color: #f1f0e9;
		transition: background-color 160ms ease, transform 160ms ease;
	}

	.surprise-button:hover {
		transform: translateY(-2px);
		background: rgb(255 255 255 / 4%);
	}

	.surprise-box {
		position: relative;
		display: block;
		height: 3.25rem;
		width: 3.25rem;
		transform: rotate(-5deg);
	}

	.surprise-box__body {
		position: absolute;
		bottom: 0.2rem;
		left: 0.3rem;
		height: 2rem;
		width: 2.7rem;
		border: 2px solid #111210;
		border-radius: 0.4rem;
		background: #d5ff35;
		box-shadow: 2px 2px 0 rgb(0 0 0 / 40%);
	}

	.surprise-box__lid {
		position: absolute;
		top: 0.35rem;
		left: 0.15rem;
		z-index: 1;
		height: 0.65rem;
		width: 3rem;
		border: 2px solid #111210;
		border-radius: 0.3rem;
		background: #ff78a8;
	}

	.surprise-box__ribbon {
		position: absolute;
		bottom: 0.2rem;
		left: 1.4rem;
		z-index: 2;
		height: 2rem;
		width: 0.45rem;
		border-right: 2px solid #111210;
		border-left: 2px solid #111210;
		background: #83e6ff;
	}

	.surprise-note {
		border-top: 1px solid rgb(255 255 255 / 10%);
		padding-top: 0.75rem;
		font-size: 0.8rem;
		line-height: 1.5;
		text-align: center;
		color: #d6d8ce;
	}

	@keyframes surprise-pop {
		from { opacity: 0; transform: translateY(12px) scale(0.94) rotate(-2deg); }
		to { opacity: 1; transform: translateY(0) scale(1) rotate(0); }
	}
</style>
