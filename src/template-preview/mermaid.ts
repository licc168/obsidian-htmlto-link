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

function getMermaidIntrinsicWidth(svg: SVGElement): number | null {
	const inlineStyle = svg.getAttribute("style") ?? "";
	const maxWidthMatch = inlineStyle.match(/(?:^|;)\s*max-width:\s*([0-9.]+)px\s*(?:;|$)/i);
	const maxWidth = maxWidthMatch ? Number.parseFloat(maxWidthMatch[1]) : Number.NaN;
	if (Number.isFinite(maxWidth) && maxWidth > 0) return maxWidth;

	const viewBox = (svg.getAttribute("viewBox") ?? "")
		.trim()
		.split(/[\s,]+/)
		.map((value) => Number.parseFloat(value));
	if (viewBox.length === 4 && Number.isFinite(viewBox[2]) && viewBox[2] > 0) {
		return viewBox[2];
	}

	const widthAttribute = svg.getAttribute("width") ?? "";
	if (widthAttribute.endsWith("%")) return null;
	const width = Number.parseFloat(widthAttribute);
	return Number.isFinite(width) && width > 0 ? width : null;
}

function preserveMermaidIntrinsicWidth(svg: SVGElement): boolean {
	const intrinsicWidth = getMermaidIntrinsicWidth(svg);
	if (!intrinsicWidth) return false;

	const width = Math.ceil(intrinsicWidth);
	svg.addClass("htmlto-link-mermaid-intrinsic");
	svg.setCssProps({ width: `${width}px` });
	svg.setAttribute("data-htmlto-link-intrinsic-width", String(width));
	return true;
}

function preserveExistingMermaidSizes(root: HTMLElement): boolean {
	let changed = false;
	for (const svg of Array.from(
		root.querySelectorAll<SVGElement>(
			".mermaid svg, [data-type='mermaid-diagram'] svg",
		),
	)) {
		changed = preserveMermaidIntrinsicWidth(svg) || changed;
	}
	return changed;
}

function collectMermaidTargets(root: HTMLElement): HTMLElement[] {
	const targets: HTMLElement[] = [];

	for (const code of Array.from(
		root.querySelectorAll<HTMLElement>(
			"pre > code.language-mermaid, pre > code.lang-mermaid, code.language-mermaid, code.lang-mermaid",
		),
	)) {
		const renderedContainer = code.closest<HTMLElement>(
			"[data-type='mermaid-diagram'], .mermaid",
		);
		if (renderedContainer?.querySelector("svg")) continue;
		const target = code.closest<HTMLElement>("pre") ?? code;
		if (!targets.includes(target)) targets.push(target);
	}

	for (const element of Array.from(
		root.querySelectorAll<HTMLElement>(
			"pre.mermaid, [data-type='mermaid-diagram'] > .mermaid, [data-type='mermaid-diagram']",
		),
	)) {
		// Obsidian may finish its own Mermaid post-processing before this local
		// preview runs. Keep that completed SVG instead of treating its label
		// text as Mermaid source and rendering the same diagram a second time.
		if (element.querySelector("svg")) continue;
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

		const preservedExistingSizes = preserveExistingMermaidSizes(root);
		const targets = collectMermaidTargets(root);
		if (targets.length === 0) return preservedExistingSizes ? root.innerHTML : html;

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
				const svgMarkup = typeof result === "string" ? result : result.svg;
				// Mermaid returns browser-ready SVG markup, which can contain HTML-style
				// serialization such as non-XML line breaks. Parse it as inert HTML so
				// valid diagrams are not rejected by the strict XML parser.
				const svgDocument = new DOMParser().parseFromString(svgMarkup, "text/html");
				const svg = svgDocument.body.querySelector("svg");
				if (!svg) {
					throw new Error("Mermaid 未返回有效的 SVG");
				}
				preserveMermaidIntrinsicWidth(svg);
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
