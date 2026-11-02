const HTML_ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

/** Only https, mailto and root-relative links are allowed. */
function safeUrl(raw: string): string | null {
	const url = raw.trim();
	if (/^https:\/\/[^\s]+$/i.test(url)) return url;
	if (/^mailto:[^\s]+$/i.test(url)) return url;
	if (/^\/(?!\/)[^\s]*$/.test(url)) return url;
	return null;
}

function inline(raw: string): string {
	return escapeHtml(raw)
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
		.replace(/\[([^\]]{1,160})\]\(([^)\s]{1,600})\)/g, (_match, label: string, target: string) => {
			const url = safeUrl(target);
			if (!url) return label;
			return `<a href="${url}" target="_blank" rel="noopener noreferrer nofollow">${label}</a>`;
		});
}

function listMarkup(ordered: boolean, items: string[]): string {
	const tag = ordered ? 'ol' : 'ul';
	return `<${tag}>${items.map((entry) => `<li>${inline(entry)}</li>`).join('')}</${tag}>`;
}

/**
 * Small, dependency-free markdown renderer for template blocks. Text is escaped
 * before any markup is added, so raw HTML authored in a block never survives.
 */
export function renderMarkdown(source: string): string {
	const normalized = String(source ?? '').replace(/\r\n?/g, '\n').trim();
	if (!normalized) return '';

	const out: string[] = [];
	let paragraph: string[] = [];
	let list: { ordered: boolean; items: string[] } | null = null;
	let quote: string[] = [];
	let code: string[] | null = null;

	const flushParagraph = () => {
		if (!paragraph.length) return;
		out.push(`<p>${inline(paragraph.join(' '))}</p>`);
		paragraph = [];
	};

	const flushList = () => {
		if (!list) return;
		out.push(listMarkup(list.ordered, list.items));
		list = null;
	};

	const flushQuote = () => {
		if (!quote.length) return;
		out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
		quote = [];
	};

	for (const rawLine of normalized.split('\n')) {
		const trimmed = rawLine.trim();

		if (code) {
			if (trimmed.startsWith('```')) {
				out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
				code = null;
			} else {
				code.push(rawLine);
			}
			continue;
		}

		if (trimmed.startsWith('```')) {
			flushParagraph();
			flushList();
			flushQuote();
			code = [];
			continue;
		}

		if (!trimmed) {
			flushParagraph();
			flushList();
			flushQuote();
			continue;
		}

		const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
		if (heading) {
			flushParagraph();
			flushList();
			flushQuote();
			const level = Math.min((heading[1] ?? '#').length, 4);
			out.push(`<h${level}>${inline(heading[2] ?? '')}</h${level}>`);
			continue;
		}

		if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
			flushParagraph();
			flushList();
			flushQuote();
			out.push('<hr />');
			continue;
		}

		const quoteMatch = /^>\s?(.*)$/.exec(trimmed);
		if (quoteMatch) {
			flushParagraph();
			flushList();
			quote.push(quoteMatch[1] ?? '');
			continue;
		}

		const ordered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
		const unordered = /^[-*+]\s+(.+)$/.exec(trimmed);
		if (ordered || unordered) {
			flushParagraph();
			flushQuote();
			const isOrdered = !unordered || Boolean(ordered);
			const item = (ordered?.[1] ?? unordered?.[1] ?? '').trim();
			if (list && list.ordered === isOrdered) {
				list.items.push(item);
			} else {
				flushList();
				list = { ordered: isOrdered, items: [item] };
			}
			continue;
		}

		flushList();
		flushQuote();
		paragraph.push(trimmed);
	}

	if (code) out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
	flushParagraph();
	flushList();
	flushQuote();

	return out.join('\n');
}
