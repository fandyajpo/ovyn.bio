<script lang="ts">
	import { cn } from '#lib/utils';

	let {
		name,
		label,
		checked = $bindable(false),
		disabled = false,
		value = 'on',
		description = null,
		class: className
	}: {
		name: string;
		label: string;
		checked?: boolean;
		disabled?: boolean;
		value?: string;
		description?: string | null;
		class?: string;
	} = $props();

	const id = $props.id();
</script>

<div class={cn('switch-field', className)}>
	<label for={id} class="switch-label">
		<span class="switch-copy">
			<span class="switch-title">{label}</span>
			{#if description}<span class="switch-description">{description}</span>{/if}
		</span>
		<span class="switch-control">
			<input {id} {name} type="checkbox" role="switch" {value} bind:checked {disabled} />
			<span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span>
		</span>
	</label>
</div>

<style>
	.switch-label {
		display: flex;
		min-height: 3.25rem;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		cursor: pointer;
	}

	.switch-copy { display: grid; gap: 0.2rem; }
	.switch-title { color: var(--color-foreground); font-size: 0.9rem; font-weight: 500; }
	.switch-description { color: var(--color-muted); font-size: 0.75rem; line-height: 1.5; }
	.switch-control { position: relative; display: inline-flex; flex: 0 0 auto; }

	.switch-control input {
		position: absolute;
		width: 1px;
		height: 1px;
		top: 50%;
		left: 50%;
		opacity: 0;
	}

	.switch-track {
		display: flex;
		width: 2.8rem;
		height: 1.6rem;
		align-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface-raised) 90%, transparent);
		padding: 0.15rem;
		transition: background-color 180ms ease, border-color 180ms ease;
	}

	.switch-thumb {
		width: 1.15rem;
		height: 1.15rem;
		border-radius: 50%;
		background: var(--color-muted);
		box-shadow: 0 2px 8px rgb(0 0 0 / 18%);
		transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), background-color 180ms ease;
	}

	.switch-control input:checked + .switch-track {
		border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
		background: color-mix(in srgb, var(--color-accent) 24%, var(--color-surface));
	}

	.switch-control input:checked + .switch-track .switch-thumb {
		transform: translateX(1.15rem);
		background: var(--color-accent);
	}

	.switch-control input:focus-visible + .switch-track {
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
	}

	.switch-control input:disabled + .switch-track { opacity: 0.5; }
	.switch-label:has(input:disabled) { cursor: not-allowed; }

	@media (prefers-reduced-motion: reduce) {
		.switch-track,
		.switch-thumb { transition: none; }
	}
</style>
