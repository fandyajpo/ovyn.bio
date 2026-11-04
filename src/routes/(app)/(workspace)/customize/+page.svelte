<script lang="ts">
  import { untrack } from "svelte";
  import type { PageData } from "./$types";
  import Button from "#lib/components/ui/Button.svelte";
  import Card from "#lib/components/ui/Card.svelte";
  import Checkbox from "#lib/components/ui/Checkbox.svelte";
  import ColorPicker from "#lib/components/ui/ColorPicker.svelte";
  import Select from "#lib/components/ui/Select.svelte";
  import UploadButton from "#lib/components/UploadButton.svelte";
  import { PROFILE_BACKGROUND_TEXTURE_OPTIONS } from "#lib/schemas/profile";

  let {
    data,
    form,
  }: { data: PageData; form?: { error?: string; ok?: string } } = $props();
  const textureOptions = PROFILE_BACKGROUND_TEXTURE_OPTIONS.map((option) => ({
    ...option,
  }));
  const coverIsVideo = $derived(
    /\.(mp4|webm)$/i.test(data.profile.bannerKey ?? ""),
  );
  const coverVideoType = $derived(
    data.profile.bannerKey?.toLowerCase().endsWith(".webm")
      ? "video/webm"
      : "video/mp4",
  );
  const backgroundIsVideo = $derived(
    /\.(mp4|webm)$/i.test(data.profile.backgroundKey ?? ""),
  );
  const backgroundVideoType = $derived(
    data.profile.backgroundKey?.toLowerCase().endsWith(".webm")
      ? "video/webm"
      : "video/mp4",
  );
  let usernameColor = $state(untrack(() => data.profile.usernameColor ?? ""));
  const colorPreview = $derived(
    /^#[0-9a-f]{6}$/i.test(usernameColor)
      ? usernameColor
      : "var(--color-accent)",
  );
</script>

<svelte:head>
  <title>Customize your page - ovyn</title>
</svelte:head>

<div class="flex flex-col gap-6">
  <div>
    <span class="sticker sticker--pink">MAKE IT YOURS</span>
    <h1 class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">
      Customize your page
    </h1>
    <p class="mt-1 text-neutral-400">
      Set your username colour, page background, cover, audio and cursor.
      <a href="/settings/profile" class="text-lime-300 hover:underline"
        >Edit your name, username and bio</a
      >.
    </p>
  </div>

  {#if form?.error}<p class="text-sm text-red-400" role="alert">
      {form.error}
    </p>{/if}
  {#if form?.ok}<p class="text-sm text-lime-300" role="status">
      {form.ok}
    </p>{/if}

  <Card class="flex flex-col gap-4 p-5">
    <div>
      <h2 class="font-medium text-neutral-100">Username colour</h2>
      <p class="mt-1 text-sm text-neutral-400">
        Colours your @handle on the public page. Leave it empty to use the theme
        accent.
      </p>
    </div>
    <form method="POST" action="?/color" class="flex flex-wrap items-end gap-3">
      <ColorPicker
        name="usernameColor"
        label="Username colour"
        bind:value={usernameColor}
        hint="Pick a swatch, or leave it empty for the theme accent."
        class="w-full sm:max-w-56"
      />
      <span
        class="color-swatch"
        style={`background: ${colorPreview}`}
        aria-hidden="true"
      ></span>
      <Button type="submit">Save colour</Button>
    </form>
    <p class="font-mono text-sm" style={`color: ${colorPreview}`}>
      ovyn.me/{data.profile.slug}
    </p>
  </Card>

  <Card class="flex flex-col gap-4 p-5">
    <div>
      <h2 class="font-medium text-neutral-100">Page background</h2>
      <p class="mt-1 text-sm text-neutral-400">
        Choose one of our built-in textures, or upload your own image. A
        background image sits behind the whole page.
      </p>
    </div>
    <form
      method="POST"
      action="?/background"
      class="flex flex-col gap-3 sm:max-w-md"
    >
      <Select
        name="texture"
        label="Built-in texture"
        options={textureOptions}
        value={data.profile.backgroundTexture}
      />
      <Checkbox
        name="fixed"
        label="Keep the background fixed while scrolling"
        checked={data.profile.backgroundFixed}
      />
      <Button type="submit" class="w-fit">Save background</Button>
    </form>
    <div class="flex flex-wrap items-center gap-3">
      {#if data.backgroundUrl}
        {#if backgroundIsVideo}
          <video
            autoplay
            loop
            muted
            playsinline
            preload="metadata"
            aria-hidden="true"
            tabindex="-1"
            class="h-16 w-28 rounded-xl object-cover"
            ><source
              src={data.backgroundUrl}
              type={backgroundVideoType}
            /></video
          >
        {:else}
          <img
            src={data.backgroundUrl}
            alt="Current background preview"
            class="h-16 w-28 rounded-xl object-cover"
          />
        {/if}
      {:else}
        <div
          class="h-16 w-28 rounded-xl border border-dashed border-neutral-700 bg-neutral-900"
        ></div>
      {/if}
      <div class="min-w-0">
        <p class="text-sm text-neutral-300">Background image</p>
        <p class="mt-1 text-xs text-neutral-500">
          JPG, PNG, WebP, GIF, MP4 or WebM · max 25 MB
        </p>
      </div>
    </div>
    <div class="flex flex-wrap gap-2">
      <UploadButton
        kind="background"
        existingKey={data.profile.backgroundKey}
        label="Upload background image"
      />
      {#if data.profile.backgroundKey}
        <form method="POST" action="?/clearBackgroundImage">
          <Button type="submit" variant="ghost">Remove image</Button>
        </form>
      {/if}
    </div>
  </Card>

  <Card class="flex flex-col gap-4 p-5">
    <h2 class="font-medium text-neutral-100">Header cover</h2>
    <div class="flex items-center gap-4">
      {#if data.bannerUrl}
        {#if coverIsVideo}
          <video
            autoplay
            loop
            muted
            playsinline
            preload="metadata"
            aria-hidden="true"
            tabindex="-1"
            class="h-16 w-28 rounded-xl object-cover"
            ><source src={data.bannerUrl} type={coverVideoType} /></video
          >
        {:else}
          <img
            src={data.bannerUrl}
            alt="Current cover preview"
            class="h-16 w-28 rounded-xl object-cover"
          />
        {/if}
      {:else}
        <div
          class="h-16 w-28 rounded-xl border border-dashed border-neutral-700 bg-neutral-900"
        ></div>
      {/if}
      <div>
        <p class="text-sm text-neutral-300">
          The banner at the top of your page.
        </p>
        <p class="mt-1 text-xs text-neutral-500">
          JPG, PNG, WebP, GIF, MP4 or WebM · max 25 MB
        </p>
      </div>
    </div>
    <UploadButton
      kind="banner"
      existingKey={data.profile.bannerKey}
      label="Upload cover"
    />
  </Card>

  <Card class="flex flex-col gap-4 p-5">
    <div>
      <h2 class="font-medium text-neutral-100">Background audio</h2>
      <p class="mt-1 text-sm text-neutral-400">
        Visitors choose when to play it; audio will never autoplay.
      </p>
    </div>
    {#if data.audioUrl}
      <audio
        controls
        preload="none"
        src={data.audioUrl}
        class="w-full"
        aria-label="Profile background audio preview"
      ></audio>
    {/if}
    <p class="text-xs text-neutral-500">
      MP3, M4A, OGG, WAV or WebM · max 10 MB
    </p>
    <div class="flex flex-wrap gap-2">
      <UploadButton
        kind="audio"
        existingKey={data.profile.audioKey}
        label="Upload audio"
      />
      {#if data.profile.audioKey}
        <form method="POST" action="?/clearAudio">
          <Button type="submit" variant="ghost">Remove audio</Button>
        </form>
      {/if}
    </div>
  </Card>

  <Card class="flex flex-col gap-4 p-5">
    <div>
      <h2 class="font-medium text-neutral-100">Custom cursor</h2>
      <p class="mt-1 text-sm text-neutral-400">
        A small PNG or WebP cursor for visitors on desktop. Touch devices keep
        their native cursor.
      </p>
    </div>
    {#if data.cursorUrl}<img
        src={data.cursorUrl}
        alt="Current custom cursor preview"
        class="size-12 object-contain"
      />{/if}
    <p class="text-xs text-neutral-500">PNG or WebP · max 256 KB</p>
    {#if data.plan.tier === "premium"}
      <div class="flex flex-wrap gap-2">
        <UploadButton
          kind="cursor"
          existingKey={data.profile.cursorKey}
          label="Upload cursor"
        />
        {#if data.profile.cursorKey}
          <form method="POST" action="?/clearCursor">
            <Button type="submit" variant="ghost">Remove cursor</Button>
          </form>
        {/if}
      </div>
    {:else}
      <a href="/upgrade" class="text-sm text-lime-300 hover:underline"
        >Unlock cursor effects with Premium ↗</a
      >
    {/if}
  </Card>

  <a href="/{data.profile.slug}" class="text-sm text-lime-300 hover:underline"
    >Preview my public page ↗</a
  >
</div>

<style>
  .color-swatch {
    display: inline-block;
    width: 2.6rem;
    height: 2.6rem;
    border: 1px solid var(--color-divider);
    border-radius: 0.8rem;
    box-shadow: inset 0 1px 0
      color-mix(in srgb, var(--color-foreground) 12%, transparent);
  }
</style>
