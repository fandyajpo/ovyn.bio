<script lang="ts">
  import { untrack } from "svelte";
  import type { PageData } from "./$types";
  import { goto, invalidateAll } from "$app/navigation";
  import Button from "#lib/components/ui/Button.svelte";
  import Avatar from "#lib/components/ui/Avatar.svelte";
  import Card from "#lib/components/ui/Card.svelte";
  import Input from "#lib/components/ui/Input.svelte";
  import Select from "#lib/components/ui/Select.svelte";
  import UploadButton from "#lib/components/UploadButton.svelte";

  let {
    data,
    form,
  }: {
    data: PageData;
    form?: {
      error?: string;
      ok?: boolean;
      values?: { username: string; displayName: string; bio: string };
      errors?: Partial<Record<"username" | "displayName" | "bio", string[]>>;
    };
  } = $props();

  const displayName = $derived(data.profile.displayName || data.profile.slug);
  let usernameStatus = $state("");
  let usernameAvailable = $state<boolean | null>(null);
  let usernameTimer: ReturnType<typeof setTimeout> | undefined;
  let usernameRequest = 0;

  let visibility = $derived(data.profile.visibility);

  type CosmeticKind = "frame" | "wallpaper" | "badge";
  let equipped = $state<Record<CosmeticKind, string>>({
    frame: untrack(() => data.profile.equippedFrameId ?? ""),
    wallpaper: untrack(() => data.profile.equippedWallpaperId ?? ""),
    badge: untrack(() => data.profile.equippedBadgeId ?? ""),
  });
  let equipping = $state<CosmeticKind | null>(null);
  let equipError = $state("");

  const cosmeticGroups = $derived([
    { key: "frame" as const, label: "Frames", items: data.owned.frames },
    {
      key: "wallpaper" as const,
      label: "Wallpapers",
      items: data.owned.wallpapers,
    },
    { key: "badge" as const, label: "Badges", items: data.owned.badges },
  ]);

  function cosmeticOptions(items: { id: string; name: string }[]) {
    return [
      { value: "", label: "None" },
      ...items.map((item) => ({ value: item.id, label: item.name })),
    ];
  }

  // After a fresh load the dropdowns follow whatever the profile actually has equipped.
  $effect(() => {
    equipped.frame = data.profile.equippedFrameId ?? "";
    equipped.wallpaper = data.profile.equippedWallpaperId ?? "";
    equipped.badge = data.profile.equippedBadgeId ?? "";
  });

  async function equip(kind: CosmeticKind, cosmeticId: string) {
    equipError = "";
    equipping = kind;
    try {
      const response = await fetch("/settings/profile?/equip", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ kind, cosmeticId }),
      });
      if (!response.ok) throw new Error("Equip failed");
    } catch {
      equipError = "Could not update that cosmetic. Try again.";
    } finally {
      equipping = null;
    }
    await invalidateAll().catch(() => {});
  }

  function checkUsername(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const value = input.value.trim().toLowerCase();
    if (usernameTimer) clearTimeout(usernameTimer);
    const requestId = ++usernameRequest;
    if (!/^[a-z0-9](?:[a-z0-9._-]{0,30}[a-z0-9])$/.test(value)) {
      usernameAvailable = null;
      usernameStatus = value
        ? "Use 2–32 letters, numbers, dots, underscores or hyphens."
        : "";
      return;
    }
    if (value === data.profile.slug) {
      usernameAvailable = true;
      usernameStatus = "This is your current username.";
      return;
    }

    usernameAvailable = null;
    usernameStatus = "Checking availability…";
    usernameTimer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/profile/username-availability?username=${encodeURIComponent(value)}`,
        );
        if (!response.ok) throw new Error("Availability check failed");
        const result = (await response.json()) as {
          valid: boolean;
          available: boolean;
        };
        if (requestId !== usernameRequest) return;
        usernameAvailable = result.valid && result.available;
        usernameStatus = !result.valid
          ? "That username is reserved or invalid."
          : result.available
            ? "Username is available."
            : "That username is already taken.";
      } catch {
        if (requestId !== usernameRequest) return;
        usernameAvailable = null;
        usernameStatus = "Could not check availability right now.";
      }
    }, 300);
  }

  async function onVisibilityChange() {
    const res = await fetch("/settings/profile?/visibility", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ visibility }),
    });
    if (res.ok) goto("", { replaceState: true });
  }
</script>

<svelte:head>
  <title>Profile settings - ovyn</title>
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-8">
  <div>
    <h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">
      Profile settings
    </h1>
    <p class="mt-1 text-neutral-400">
      Sign in with email or a username, Discord or Google, then make your ovyn profile your own.
    </p>
  </div>

  {#if form?.ok}
    <p
      class="rounded-lg border border-lime-300/40 bg-lime-300/10 px-4 py-3 text-sm text-lime-200"
      role="status"
    >
      Saved.
    </p>
  {/if}

  <Card class="settings-card flex items-center gap-4 p-5">
    <Avatar name={displayName} src={data.avatarUrl} size="lg" />
    <div class="min-w-0">
      <p class="truncate font-medium text-neutral-100">{displayName}</p>
      <p class="font-mono text-xs text-neutral-500">
        ovyn.me/{data.profile.slug}
      </p>
      <a
        href="/account/settings"
        class="mt-1 inline-block text-xs text-neutral-500 hover:text-neutral-300"
      >
        Sign-in details · Account settings
      </a>
    </div>
  </Card>

  <Card class="settings-card p-5">
    <h2 class="mb-4 font-medium text-neutral-200">Your profile details</h2>
    <form
      method="POST"
      action="/settings/profile?/identity"
      class="flex flex-col gap-4"
    >
      <Input
        name="displayName"
        label="Display name"
        value={form?.values?.displayName ??
          data.profile.displayName ??
          displayName}
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
          pattern={"[A-Za-z0-9][A-Za-z0-9._-]{0,30}[A-Za-z0-9]"}
          autocomplete="username"
          hint="Your public link uses this unique username."
          error={form?.errors?.username?.[0]}
          oninput={checkUsername}
        />
        {#if usernameStatus}
          <p
            class="mt-1 text-xs {usernameAvailable === true
              ? 'text-lime-300'
              : usernameAvailable === false
                ? 'text-red-400'
                : 'text-neutral-500'}"
            aria-live="polite"
          >
            {usernameStatus}
          </p>
        {/if}
      </div>
      <Input
        name="bio"
        label="Bio"
        value={form?.values?.bio ?? data.profile.bio ?? ""}
        textarea
        maxlength={280}
        hint="Up to 280 characters. Your ovyn bio is separate from your Discord bio."
        error={form?.errors?.bio?.[0]}
      />
      {#if form?.error && !form?.errors?.username?.length && !form?.errors?.displayName?.length && !form?.errors?.bio?.length}
        <p class="text-sm text-red-400" role="alert">{form.error}</p>
      {/if}
      <div>
        <Button type="submit" class="w-fit">Save profile</Button>
      </div>
    </form>
  </Card>

  <Card class="settings-card p-5">
    <h2 class="mb-3 font-medium text-neutral-200">Profile picture</h2>
    <div class="flex items-center gap-4">
      <Avatar name={displayName} src={data.avatarUrl} size="lg" />
      <div>
        <p class="mb-1 text-sm text-neutral-300">
          Upload a custom picture. Removing it shows your initial instead.
        </p>
        <p class="mb-2 text-xs text-neutral-500">
          JPG, PNG, GIF, WebP, AVIF, SVG and more · max 4 MB
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <UploadButton
            kind="avatar"
            existingKey={data.profile.avatarKey}
            label="Upload picture"
          />
          {#if data.profile.avatarKey}
            <form method="POST" action="/settings/profile?/avatarReset">
              <button
                type="submit"
                class="rounded-xl border border-neutral-700 px-3 py-2 text-xs text-neutral-300 transition hover:bg-neutral-800"
                >Remove picture</button
              >
            </form>
          {/if}
        </div>
      </div>
    </div>
  </Card>

  <Card class="settings-card p-5">
    <h2 class="mb-1 font-medium text-neutral-200">Cosmetics</h2>
    <p class="mb-4 text-sm text-neutral-400">
      Owned frames, wallpapers and badges. Choose one from each dropdown, or
      None to take it off. Get more in the <a
        href="/shop"
        class="text-lime-300 hover:underline">shop</a
      >.
    </p>

    <div class="mt-4 flex flex-col gap-4">
      {#each cosmeticGroups as group (group.key)}
        <Select
          name={`cosmetic-${group.key}`}
          label={group.label}
          options={cosmeticOptions(group.items)}
          bind:value={equipped[group.key]}
          hint={group.items.length === 0
            ? "Nothing owned yet. Pick something up in the shop."
            : null}
          onchange={(value) => equip(group.key, value)}
        />
      {/each}
    </div>

    {#if equipping}<p class="mt-3 text-xs text-neutral-500">Saving…</p>{/if}
    {#if equipError}<p class="mt-3 text-sm text-red-400" role="alert">
        {equipError}
      </p>{/if}
  </Card>

  <Card class="settings-card p-5">
    <h2 class="mb-3 font-medium text-neutral-200">Page visibility</h2>
    <label class="flex items-center gap-3 text-sm text-neutral-300">
      <input
        type="checkbox"
        checked={visibility === "public"}
        onchange={() => {
          visibility = visibility === "public" ? "private" : "public";
          onVisibilityChange();
        }}
      />
      Anyone can visit ovyn.me/{data.profile.slug}
    </label>
    {#if form?.error && !form?.values}
      <p class="mt-2 text-sm text-red-400" role="alert">{form.error}</p>
    {/if}
  </Card>
</div>

<style>
  /* The aurora runs behind this page, so every card paints its own opaque
	   surface instead of letting the gradient bleed through the form. */
  :global(.ovyn-surface.settings-card) {
    background: var(--color-surface);
  }
</style>
