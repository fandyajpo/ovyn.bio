<script lang="ts">
	import type { Snippet } from 'svelte';
	import DropdownSelect from './DropdownSelect.svelte';

	type Option = { value: string; label: string; disabled?: boolean };

	let {
		name,
		label,
		options,
		value = $bindable(''),
		placeholder = 'Choose an option',
		required = false,
		disabled = false,
		hint = null,
		error = null,
		class: className,
		optionIcon = undefined,
		onchange = undefined
	}: {
		name: string;
		label: string;
		options: Option[];
		value?: string;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		hint?: string | null;
		error?: string | null;
		class?: string;
		optionIcon?: Snippet<[Option]>;
		onchange?: (value: string) => void;
	} = $props();
</script>

<DropdownSelect
	{name}
	{label}
	{options}
	bind:value
	{placeholder}
	{required}
	{disabled}
	{hint}
	{error}
	class={className}
	{optionIcon}
	onchange={(value: string) => onchange?.(value)}
/>
