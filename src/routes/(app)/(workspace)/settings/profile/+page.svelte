<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import UploadButton from '#lib/components/UploadButton.svelte';

	let { data, form }: {
		data: PageData;
		form?: {
			error?: string;
			ok?: boolean;
			values?: { username: string; displayName: string; bio: string };
			errors?: Partial<Record<'username' | 'displayName' | 'bio', string[]>>;
		};
	} = $props();

	const displayName = $derived(
		data.profile.displayName || data.discord?.globalName || data.discord?.username || data.profile.slug
	);
	let usernameStatus = $state('');
	let usernameAvailable = $state<boolean | null>(null);
	let usernameTimer: ReturnType<typeof setTimeout> | undefined;
	let usernameRequest = 0;

	let visibility = $derived(data.profile.visibility);

	function checkUsername(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const value = input.value.trim().toLowerCase();
		if (usernameTimer) clearTimeout(usernameTimer);
		const requestId = ++usernameRequest;
		if (!/^[a-z0-9](?:[a-z0-9._-]{0,30}[a-z0-9])$/.test(value)) {
			usernameAvailable = null;
			usernameStatus = value ? 'Use 2–32 letters, numbers, dots, underscores or hyphens.' : '';
			return;
		}
		if (value === data.profile.slug) {
			usernameAvailable = true;
			usernameStatus = 'This is your current username.';
			return;
		}

		usernameAvailable = null;
		usernameStatus = 'Checking availability…';
		usernameTimer = setTimeout(async () => {
			try {
				const response = await fetch(`/api/profile/username-availability?username=${encodeURIComponent(value)}`);
				if (!response.ok) throw new Error('Availability check failed');
				const result = (await response.json()) as { valid: boolean; available: boolean };
				if (requestId !== usernameRequest) return;
				usernameAvailable = result.valid && result.available;
				usernameStatus = !result.valid
					? 'That username is reserved or invalid.'
					: result.available
						? 'Username is available.'
						: 'That username is already taken.';
			} catch {
				if (requestId !== usernameRequest) return;
				usernameAvailable = null;
				usernameStatus = 'Could not check availability right now.';
			}
		}, 300);
	}

	async function onVisibilityChange() {
		const res = await fetch('/settings/profile?/visibility', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ visibility })
		});
		if (res.ok) goto('', { replaceState: true });
	}
</script>

<svelte:head>
	<title>Profile settings - ovyn</title>
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-8">
	<div>
		<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Profile settings</h1>
		<p class="mt-1 text-neutral-400">
			Sign in with Discord or Google, then make your ovyn profile your own.
		</p>
	</div>

	{#if form?.ok}
		<p class="rounded-lg border border-lime-300/40 bg-lime-300/10 px-4 py-3 text-sm text-lime-200" role="status">
			Saved.
		</p>
	{/if}

	<section class="flex items-center gap-4 rounded-xl border border-neutral-800 p-5">
		<Avatar name={displayName} src={data.avatarUrl} size="lg" />
		<div class="min-w-0">
			<p class="truncate font-medium text-neutral-100">{displayName}</p>
			<p class="font-mono text-xs text-neutral-500">ovyn.bio/{data.profile.slug}</p>
			{#if data.discord}
				<p class="font-mono text-xs text-neutral-600">discord: {data.discord.username}</p>
			{/if}
			<a href="/account/settings" class="mt-1 inline-block text-xs text-neutral-500 hover:text-neutral-300">
				Sign-in details · Account settings
			</a>
		</div>
	</section>

	<section class="rounded-xl border border-neutral-800 p-5">
		<h2 class="mb-4 font-medium text-neutral-200">Your profile details</h2>
		<form method="POST" action="/settings/profile?/identity" class="flex flex-col gap-4">
			<Input
				name="displayName"
				label="Display name"
				value={form?.values?.displayName ?? data.profile.displayName ?? displayName}
				maxlength={40}
				required
				error={form?.errors?.displayName?.[0]}
			/>
			<div>
				<Input
					name="username"
					label="Unique username"
					value={form?.values?.username ?? data.profile.slug}
					minlength={2}
					maxlength={32}
					required
					pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,30}[A-Za-z0-9]"
					autocomplete="username"
					hint="Your public link uses this unique username."
					error={form?.errors?.username?.[0]}
					oninput={checkUsername}
				/>
				{#if usernameStatus}
					<p class="mt-1 text-xs {usernameAvailable === true ? 'text-lime-300' : usernameAvailable === false ? 'text-red-400' : 'text-neutral-500'}" aria-live="polite">{usernameStatus}</p>
				{/if}
			</div>
			<Input
				name="bio"
				label="Bio"
				value={form?.values?.bio ?? data.profile.bio ?? ''}
				textarea
				maxlength={280}
				hint="Up to 280 characters. Your ovyn bio is separate from your Discord bio."
				error={form?.errors?.bio?.[0]}
			/>
			{#if form?.error && !form?.errors?.username?.length && !form?.errors?.displayName?.length && !form?.errors?.bio?.length}
				<p class="text-sm text-red-400" role="alert">{form.error}</p>
			{/if}
			<div>
				<button type="submit" class="rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-lime-200">Save profile</button>
			</div>
		</form>
	</section>

	<section class="rounded-xl border border-neutral-800 p-5">
		<h2 class="mb-3 font-medium text-neutral-200">Profile picture</h2>
		<div class="flex items-center gap-4">
			<Avatar name={displayName} src={data.avatarUrl} size="lg" />
			<div>
				<p class="mb-1 text-sm text-neutral-300">Use your sign-in account picture or upload a custom one.</p>
				<p class="mb-2 text-xs text-neutral-500">JPG, PNG or WebP · max 1 MB</p>
				<div class="flex flex-wrap items-center gap-2">
					<UploadButton kind="avatar" existingKey={data.profile.avatarKey} label="Upload picture" />
					{#if data.profile.avatarKey}
						<form method="POST" action="/settings/profile?/avatarReset">
							<button type="submit" class="rounded-xl border border-neutral-700 px-3 py-2 text-xs text-neutral-300 transition hover:bg-neutral-800">Use account picture</button>
						</form>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<section class="rounded-xl border border-neutral-800 p-5">
		<h2 class="mb-1 font-medium text-neutral-200">Cosmetics</h2>
		<p class="mb-4 text-sm text-neutral-400">
			Owned frames, wallpapers and badges. Get more in the <a href="/shop" class="text-lime-300 hover:underline">shop</a>.
		</p>

		{#each [
			{ key: 'frame', label: 'Frames', items: data.owned.frames },
			{ key: 'wallpaper', label: 'Wallpapers', items: data.owned.wallpapers },
			{ key: 'badge', label: 'Badges', items: data.owned.badges }
		] as group (group.key)}
			<h3 class="mt-3 mb-2 font-mono text-xs text-neutral-500 uppercase">{group.label}</h3>
			{#if group.items.length === 0}
				<p class="text-xs text-neutral-600">None owned yet.</p>
			{:else}
				<div class="flex flex-wrap gap-2">
					<form method="POST" action="/settings/profile?/equip">
						<input type="hidden" name="kind" value={group.key} />
						<input type="hidden" name="cosmeticId" value="" />
						<button
							type="submit"
							class="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-400 transition-colors hover:bg-neutral-800"
						>
							None
						</button>
					</form>
					{#each group.items as c (c.id)}
						<form method="POST" action="/settings/profile?/equip">
							<input type="hidden" name="kind" value={c.kind} />
							<input type="hidden" name="cosmeticId" value={c.id} />
							<button
								type="submit"
								class="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors
									{data.profile.equippedFrameId === c.id
									|| data.profile.equippedWallpaperId === c.id
									|| data.profile.equippedBadgeId === c.id
									? 'border-lime-300/50 bg-lime-300/10 text-lime-300'
									: 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'}"
							>
								{c.name}
							</button>
						</form>
					{/each}
				</div>
			{/if}
		{/each}
	</section>

	<section class="rounded-xl border border-neutral-800 p-5">
		<h2 class="mb-3 font-medium text-neutral-200">Page visibility</h2>
		<label class="flex items-center gap-3 text-sm text-neutral-300">
			<input
				type="checkbox"
				checked={visibility === 'public'}
				onchange={() => {
					visibility = visibility === 'public' ? 'private' : 'public';
					onVisibilityChange();
				}}
			/>
			Anyone can visit ovyn.bio/{data.profile.slug}
		</label>
		{#if form?.error && !form?.values}
			<p class="mt-2 text-sm text-red-400" role="alert">{form.error}</p>
		{/if}
	</section>
</div>
