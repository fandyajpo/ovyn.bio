<script lang="ts">
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
		class: className
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
/>
