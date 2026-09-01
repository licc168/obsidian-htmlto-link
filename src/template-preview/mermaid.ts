type MermaidApi = typeof import("mermaid")["default"];

let mermaidApiPromise: Promise<MermaidApi> | null = null;
let mermaidInitialized = false;
let mermaidRenderSequence = 0;

async function loadMermaid(): Promise<MermaidApi> {
	if (!mermaidApiPromise) {
		mermaidApiPromise = import("mermaid").then((module) => module.default);
	}
	return mermaidApiPromise;
}

function initializeMermaid(mermaid: MermaidApi): void {
	if (mermaidInitialized) return;

	mermaid.initialize({
		startOnLoad: false,
		suppressErrorRendering: true,
		securityLevel: "strict",
		theme: "default",
		fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
		flowchart: {
			htmlLabels: false,
			useMaxWidth: true,
			wrappingWidth: 300,
		},
	});
	mermaidInitialized = true;
}

function getMermaidDefinition(element: HTMLElement): string {
	return (element.getAttribute("data-content") ?? element.textContent ?? "").trim();
}

function createMermaidError(root: HTMLElement, message: string): HTMLElement {
	const error = root.createDiv({ cls: "mermaid mermaid-error" });
	error.textContent = `流程图渲染失败：${message}`;
	return error;
}

function getMermaidErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Mermaid 库加载失败";
}

function collectMermaidTargets(root: HTMLElement): HTMLElement[] {
	const targets: HTMLElement[] = [];

	for (const code of Array.from(
		root.querySelectorAll<HTMLElement>(
			"pre > code.language-mermaid, pre > code.lang-mermaid, code.language-mermaid, code.lang-mermaid",
		),
	)) {
		const target = code.closest<HTMLElement>("pre") ?? code;
		if (!targets.includes(target)) targets.push(target);
	}

	for (const element of Array.from(
		root.querySelectorAll<HTMLElement>(
			"pre.mermaid, [data-type='mermaid-diagram'] > .mermaid, [data-type='mermaid-diagram']",
		),
	)) {
		if (targets.includes(element)) continue;
		if (targets.some((target) => target.contains(element) || element.contains(target))) continue;
		targets.push(element);
	}

	return targets;
}

/**
 * Render Mermaid code blocks before the HTML is placed in the script-free
 * preview iframe. The iframe receives SVG only, so it never needs to execute
 * Mermaid or any other note-provided script.
 */
export async function renderMermaidInHtml(html: string): Promise<string> {
	if (typeof document === "undefined" || !html) return html;

	const root = document.body.createDiv({ cls: "htmlto-link-mermaid-staging" });
	root.setCssProps({ display: "none" });
	try {
		const parsed = new DOMParser().parseFromString(html, "text/html");
		for (const child of Array.from(parsed.body.childNodes)) {
			root.appendChild(document.importNode(child, true));
		}

		const targets = collectMermaidTargets(root);
		if (targets.length === 0) return html;

		let mermaid: MermaidApi;
		try {
			mermaid = await loadMermaid();
			initializeMermaid(mermaid);
		} catch (error) {
			const message = getMermaidErrorMessage(error);
			for (const target of targets) {
				target.replaceWith(createMermaidError(root, message));
			}
			return root.innerHTML;
		}

		for (const target of targets) {
			const definition = getMermaidDefinition(target);
			if (!definition) continue;

			try {
				const id = `htmlto-link-mermaid-${Date.now()}-${mermaidRenderSequence++}`;
				const result = await mermaid.render(id, definition);
				const svgDocument = new DOMParser().parseFromString(result.svg, "image/svg+xml");
				const svg = svgDocument.documentElement;
				if (svg.tagName.toLowerCase() !== "svg") {
					throw new Error("Mermaid 未返回有效的 SVG");
				}
				const rendered = root.createDiv({ cls: "mermaid" });
				rendered.appendChild(document.importNode(svg, true));
				target.replaceWith(rendered);
			} catch (error) {
				const message = getMermaidErrorMessage(error);
				console.warn("HTML to Link: Mermaid 渲染失败", error);
				target.replaceWith(createMermaidError(root, message));
			}
		}

		return root.innerHTML;
	} finally {
		root.remove();
	}
}
