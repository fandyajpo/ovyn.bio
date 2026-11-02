<script lang="ts">
	import Input from '#lib/components/ui/Input.svelte';
	import Button from '#lib/components/ui/Button.svelte';

	let { form }: { form?: { error?: string } } = $props();

	let name = $state('');
	let description = $state('');
	let visibility = $state<'public' | 'private'>('public');
</script>

<svelte:head>
	<title>Create a circle - ovyn</title>
</svelte:head>

<div class="mx-auto flex max-w-xl flex-col gap-6">
	<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Create a circle</h1>
	<p class="text-neutral-400">
		You can belong to one circle at a time. Creating this circle makes you its owner.
	</p>

	<form method="POST" action="/guild/create" class="flex flex-col gap-5">
		<Input name="name" label="Circle name" bind:value={name} required minlength={2} maxlength={50} />
		<Input name="description" label="Description" bind:value={description} textarea maxlength={500} />

		<fieldset class="flex items-center gap-3">
			<legend class="mb-1.5 text-sm font-medium text-neutral-300">Visibility</legend>
			<label class="flex items-center gap-2 text-sm text-neutral-300">
				<input type="radio" name="visibility" value="public" bind:group={visibility} />
				Public: anyone can discover and join
			</label>
			<label class="flex items-center gap-2 text-sm text-neutral-300">
				<input type="radio" name="visibility" value="private" bind:group={visibility} />
				Private: invitation only
			</label>
		</fieldset>

		{#if form?.error}
			<p class="text-sm text-red-400" role="alert">{form.error}</p>
		{/if}

		<Button type="submit">Create circle</Button>
	</form>
</div>
