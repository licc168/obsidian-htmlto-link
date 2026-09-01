import hljs from "highlight.js/lib/common";

function getExplicitLanguage(code: HTMLElement): string | undefined {
	for (const className of Array.from(code.classList)) {
		const match = className.match(/^(?:language|lang)-(.+)$/i);
		if (!match) continue;
		const language = match[1].toLowerCase();
		return hljs.getLanguage(language) ? language : undefined;
	}
	return undefined;
}

function inferLanguage(source: string): string | undefined {
	const trimmed = source.trim();
	if (
		/^(?:--[^\r\n]*\r?\n\s*)?(?:alter|create|drop|insert|update|delete|select|with|replace|truncate|grant|revoke)\b/i.test(
			trimmed,
		) &&
		/\b(?:table|index|key|from|into|where|join|database|column|values|set|primary|unique)\b/i.test(
			trimmed,
		)
	) {
		return "sql";
	}
	return undefined;
}

function appendHighlightedMarkup(code: HTMLElement, highlightedHtml: string): void {
	const parsed = new DOMParser().parseFromString(
		`<div data-highlighted-code="true">${highlightedHtml}</div>`,
		"text/html",
	);
	const container = parsed.body.firstElementChild;
	if (!container) return;

	const fragment = createFragment();
	for (const child of Array.from(container.childNodes)) {
		fragment.appendChild(code.ownerDocument.importNode(child, true));
	}
	code.replaceChildren(fragment);
}

function highlightCodeBlock(root: HTMLElement, pre: HTMLPreElement): void {
	if (pre.classList.contains("mermaid") || pre.closest(".hljs-code-block")) return;

	const code = Array.from(pre.children).find(
		(element) => element.tagName.toLowerCase() === "code",
	) as HTMLElement | undefined;
	if (!code) return;

	const source = code.textContent ?? "";
	if (!source.trim()) return;

	const explicitLanguage = getExplicitLanguage(code);
	const inferredLanguage = explicitLanguage ?? inferLanguage(source);
	let highlightedHtml = "";
	let detectedLanguage = inferredLanguage ?? "";
	try {
		if (inferredLanguage) {
			highlightedHtml = hljs.highlight(source, {
				language: inferredLanguage,
				ignoreIllegals: true,
			}).value;
		} else {
			const result = hljs.highlightAuto(source);
			highlightedHtml = result.value;
			detectedLanguage = result.language ?? "";
		}
	} catch (error) {
		console.warn("HTML to Link: 代码高亮失败", error);
		highlightedHtml = source
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	appendHighlightedMarkup(code, highlightedHtml);
	code.classList.add("hljs");
	if (detectedLanguage && !getExplicitLanguage(code)) {
		code.classList.add(`language-${detectedLanguage}`);
	}

	const wrapper = root.createDiv({ cls: "hljs-code-block" });
	pre.replaceWith(wrapper);
	if (detectedLanguage) {
		wrapper.createDiv({ cls: "hljs-lang-label", text: detectedLanguage });
	}
	wrapper.appendChild(pre);
}

/**
 * Apply the same highlight.js structure used by the published page to the
 * HTML produced by Obsidian's MarkdownRenderer.
 */
export function highlightCodeBlocks(html: string): string {
	if (typeof document === "undefined" || !html) return html;

	const parsed = new DOMParser().parseFromString(html, "text/html");
	const root = document.body.createDiv({ cls: "htmlto-link-highlight-staging" });
	root.setCssProps({ display: "none" });
	try {
		for (const child of Array.from(parsed.body.childNodes)) {
			root.appendChild(document.importNode(child, true));
		}
		for (const pre of Array.from(root.querySelectorAll<HTMLPreElement>("pre"))) {
			highlightCodeBlock(root, pre);
		}
		return root.innerHTML;
	} finally {
		root.remove();
	}
}
