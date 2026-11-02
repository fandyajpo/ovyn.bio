<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Link from '@tiptap/extension-link';
	import { Markdown } from 'tiptap-markdown';

	let {
		value = '',
		label = 'Rich text',
		minHeight = '8rem',
		onChange
	}: {
		value?: string;
		label?: string;
		minHeight?: string;
		onChange: (markdown: string) => void;
	} = $props();

	let element: HTMLDivElement | undefined = $state();
	let editor = $state<Editor | null>(null);
	let lastEmitted = '';

	const marks = $state({
		bold: false,
		italic: false,
		strike: false,
		code: false,
		h2: false,
		h3: false,
		bulletList: false,
		orderedList: false,
		blockquote: false,
		codeBlock: false,
		link: false
	});

	function readMarkdown(instance: Editor): string {
		const storage = instance.storage as { markdown?: { getMarkdown?: () => string } };
		if (typeof storage.markdown?.getMarkdown === 'function') return storage.markdown.getMarkdown();
		return instance.getText();
	}

	function syncMarks(): void {
		const instance = editor;
		if (!instance) return;
		marks.bold = instance.isActive('bold');
		marks.italic = instance.isActive('italic');
		marks.strike = instance.isActive('strike');
		marks.code = instance.isActive('code');
		marks.h2 = instance.isActive('heading', { level: 2 });
		marks.h3 = instance.isActive('heading', { level: 3 });
		marks.bulletList = instance.isActive('bulletList');
		marks.orderedList = instance.isActive('orderedList');
		marks.blockquote = instance.isActive('blockquote');
		marks.codeBlock = instance.isActive('codeBlock');
		marks.link = instance.isActive('link');
	}

	onMount(() => {
		const target = element;
		if (!target) return;

		lastEmitted = value;
		const instance = new Editor({
			element: target,
			extensions: [
				StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
				Link.configure({
					openOnClick: false,
					autolink: true,
					HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' }
				}),
				Markdown.configure({ html: false, tightLists: false })
			],
			content: value,
			editorProps: {
				attributes: { class: 'ovyn-rich-text', 'aria-label': label }
			},
			onUpdate: ({ editor: current }) => {
				const markdown = readMarkdown(current);
				lastEmitted = markdown;
				syncMarks();
				onChange(markdown);
			},
			onSelectionUpdate: () => syncMarks()
		});

		editor = instance;
		syncMarks();

		return () => {
			instance.destroy();
			editor = null;
		};
	});

	$effect(() => {
		const next = value;
		const instance = editor;
		if (!instance || next === lastEmitted) return;
		const current = readMarkdown(instance);
		if (current === next) return;
		lastEmitted = next;
		instance.commands.setContent(next);
	});

	function setLink(): void {
		const instance = editor;
		if (!instance) return;
		const previous = (instance.getAttributes('link').href as string | undefined) ?? '';
		const answer = window.prompt('Link URL (https://…)', previous || 'https://');
		if (answer === null) return;
		const href = answer.trim();
		if (!href) {
			instance.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}
		if (!/^https:\/\/[^\s]+$/i.test(href)) {
			window.alert('Use an https:// link.');
			return;
		}
		instance.chain().focus().extendMarkRange('link').setLink({ href }).run();
	}
</script>

<div class="rich-editor" style={`--rich-min-height: ${minHeight}`}>
	<div class="rich-toolbar" role="toolbar" aria-label={`${label} formatting`}>
		<button type="button" class:active={marks.bold} disabled={!editor} title="Bold" onclick={() => editor?.chain().focus().toggleBold().run()}><strong>B</strong></button>
		<button type="button" class:active={marks.italic} disabled={!editor} title="Italic" onclick={() => editor?.chain().focus().toggleItalic().run()}><em>I</em></button>
		<button type="button" class:active={marks.strike} disabled={!editor} title="Strikethrough" onclick={() => editor?.chain().focus().toggleStrike().run()}><span class="strike">S</span></button>
		<button type="button" class:active={marks.code} disabled={!editor} title="Inline code" onclick={() => editor?.chain().focus().toggleCode().run()}>{"</>"}</button>
		<span class="rich-divider" aria-hidden="true"></span>
		<button type="button" class:active={marks.h2} disabled={!editor} title="Heading 2" onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
		<button type="button" class:active={marks.h3} disabled={!editor} title="Heading 3" onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
		<span class="rich-divider" aria-hidden="true"></span>
		<button type="button" class:active={marks.bulletList} disabled={!editor} title="Bullet list" onclick={() => editor?.chain().focus().toggleBulletList().run()}>• List</button>
		<button type="button" class:active={marks.orderedList} disabled={!editor} title="Numbered list" onclick={() => editor?.chain().focus().toggleOrderedList().run()}>1. List</button>
		<button type="button" class:active={marks.blockquote} disabled={!editor} title="Quote" onclick={() => editor?.chain().focus().toggleBlockquote().run()}>Quote</button>
		<button type="button" class:active={marks.codeBlock} disabled={!editor} title="Code block" onclick={() => editor?.chain().focus().toggleCodeBlock().run()}>Code block</button>
		<span class="rich-divider" aria-hidden="true"></span>
		<button type="button" class:active={marks.link} disabled={!editor} title="Link" onclick={setLink}>Link</button>
		<button type="button" disabled={!editor} title="Horizontal rule" onclick={() => editor?.chain().focus().setHorizontalRule().run()}>—</button>
		<button type="button" disabled={!editor} title="Clear formatting" onclick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}>Clear</button>
		<span class="rich-divider" aria-hidden="true"></span>
		<button type="button" disabled={!editor} title="Undo" onclick={() => editor?.chain().focus().undo().run()}>↺</button>
		<button type="button" disabled={!editor} title="Redo" onclick={() => editor?.chain().focus().redo().run()}>↻</button>
	</div>
	<div class="rich-surface" bind:this={element}></div>
</div>

<style>
	.rich-editor {
		overflow: hidden;
		border: 1px solid var(--color-divider);
		border-radius: 0.85rem;
		background: color-mix(in srgb, var(--color-background) 66%, transparent);
	}

	.rich-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.15rem;
		border-bottom: 1px solid var(--color-divider);
		padding: 0.35rem;
	}

	.rich-toolbar button {
		min-height: 1.85rem;
		border: 0;
		border-radius: 0.45rem;
		background: transparent;
		padding: 0.2rem 0.5rem;
		color: var(--color-muted);
		font: inherit;
		font-size: 0.7rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 140ms ease, color 140ms ease;
	}

	.rich-toolbar button:hover:not(:disabled) { background: var(--color-accent-soft); color: var(--color-foreground); }
	.rich-toolbar button.active { background: var(--color-accent-soft); color: var(--color-accent); }
	.rich-toolbar button:disabled { cursor: not-allowed; color: var(--color-muted); }
	.rich-divider { width: 1px; height: 1.2rem; margin: 0 0.2rem; background: var(--color-divider); }
	.strike { text-decoration: line-through; }

	.rich-surface { padding: 0.7rem 0.8rem; }

	.rich-surface :global(.ovyn-rich-text) {
		min-height: var(--rich-min-height);
		outline: none;
		color: var(--color-foreground);
		font-size: 0.86rem;
		line-height: 1.7;
	}

	.rich-surface :global(.ovyn-rich-text p) { margin: 0 0 0.6rem; }
	.rich-surface :global(.ovyn-rich-text p:last-child) { margin-bottom: 0; }

	.rich-surface :global(.ovyn-rich-text h2),
	.rich-surface :global(.ovyn-rich-text h3),
	.rich-surface :global(.ovyn-rich-text h4) {
		margin: 0.9rem 0 0.45rem;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.rich-surface :global(.ovyn-rich-text h2) { font-size: 1.15rem; }
	.rich-surface :global(.ovyn-rich-text h3) { font-size: 1rem; }
	.rich-surface :global(.ovyn-rich-text h4) { font-size: 0.92rem; }

	.rich-surface :global(.ovyn-rich-text ul),
	.rich-surface :global(.ovyn-rich-text ol) {
		margin: 0 0 0.6rem;
		padding-left: 1.35rem;
	}

	.rich-surface :global(.ovyn-rich-text ul) { list-style: disc; }
	.rich-surface :global(.ovyn-rich-text ol) { list-style: decimal; }
	.rich-surface :global(.ovyn-rich-text li::marker) { color: var(--color-accent); }

	.rich-surface :global(.ovyn-rich-text blockquote) {
		margin: 0 0 0.6rem;
		border-left: 2px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
		padding-left: 0.8rem;
		color: var(--color-muted);
	}

	.rich-surface :global(.ovyn-rich-text pre) {
		margin: 0 0 0.6rem;
		overflow-x: auto;
		border: 1px solid var(--color-divider);
		border-radius: 0.7rem;
		background: color-mix(in srgb, var(--color-surface) 70%, transparent);
		padding: 0.6rem 0.75rem;
		font-family: var(--font-mono);
		font-size: 0.78rem;
	}

	.rich-surface :global(.ovyn-rich-text code) {
		font-family: var(--font-mono);
		font-size: 0.82em;
	}

	.rich-surface :global(.ovyn-rich-text a) { color: var(--color-accent); text-decoration: underline; }
	.rich-surface :global(.ovyn-rich-text hr) { margin: 0.9rem 0; border: 0; border-top: 1px solid var(--color-divider); }
	.rich-surface :global(.ovyn-rich-text p.is-editor-empty:first-child::before) { color: var(--color-muted); content: 'Write something…'; }
</style>
