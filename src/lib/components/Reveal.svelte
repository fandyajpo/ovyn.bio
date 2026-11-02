<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		delay = 0,
		stagger = false,
		class: className = '',
		children
	}: { delay?: number; stagger?: boolean; class?: string; children: Snippet } = $props();

	let enhanced = $state(false);
	let visible = $state(false);

	function observeReveal(element: HTMLDivElement) {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
			enhanced = true;
			visible = true;
			return;
		}

		enhanced = true;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						visible = true;
						observer.unobserve(entry.target);
					}
				}
			},
			{ threshold: 0.12, rootMargin: '0px 0px -36px 0px' }
		);
		observer.observe(element);
		return () => observer.disconnect();
	}
</script>

<div
	{@attach observeReveal}
	class="ovyn-reveal {className}"
	data-enhanced={enhanced ? 'true' : undefined}
	data-visible={visible ? 'true' : undefined}
	data-stagger={stagger ? 'true' : undefined}
	style={`--reveal-delay: ${delay}ms`}
>
	{@render children()}
</div>

<style>
	.ovyn-reveal {
		opacity: 1;
		transform: none;
	}

	.ovyn-reveal[data-enhanced='true']:not([data-visible='true']) {
		opacity: 0;
		transform: translate3d(0, 22px, 0) scale(0.985);
	}

	.ovyn-reveal[data-enhanced='true'][data-visible='true'] {
		opacity: 1;
		transform: translate3d(0, 0, 0) scale(1);
		transition:
			opacity 620ms cubic-bezier(0.2, 0.7, 0.2, 1),
			transform 620ms cubic-bezier(0.2, 0.7, 0.2, 1);
		transition-delay: var(--reveal-delay, 0ms);
	}

	@media (prefers-reduced-motion: reduce) {
		.ovyn-reveal {
			opacity: 1 !important;
			transform: none !important;
			transition: none !important;
		}
	}
</style>
