import { App, Component, MarkdownRenderer, TFile } from "obsidian";
import { COMMON_TEMPLATE_STYLES, TEMPLATE_STYLES } from "./generated/template-styles";
import {
	getPreviewTemplateMeta,
	getPreviewThemeClass,
} from "./registry";

const FRAME_STYLES = `
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body.share-page {
  min-height: 100vh;
  padding: 0;
  background: #f1f5f9;
  color: #1e293b;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.share-layout { min-height: 100vh; padding: 24px 16px 48px; }
.share-export-target { display: flex; justify-content: center; min-height: calc(100vh - 72px); }
.share-stage { display: flex; justify-content: center; width: 100%; }
.share-card-shell { width: min(100%, 48rem); max-width: 48rem; min-width: 0; }
.share-card-shell .card { width: 100%; max-width: 100%; margin: 0 auto; }
.share-card-shell .card:not(.card-plain) {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14);
}
.share-card-shell .card.card-plain { border-radius: 0; box-shadow: none; }
.card-content-inner img { max-width: 100%; height: auto; }
.markdown-table-wrapper { width: 100%; max-width: 100%; overflow-x: auto; padding-bottom: 4px; }
.markdown-table-wrapper > table { min-width: 100%; }
.preview-empty { padding: 48px 24px; color: #64748b; text-align: center; }
@media (max-width: 640px) {
  .share-layout { padding: 16px 12px 32px; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; } }
`;

// Template styles were authored for the published page and some of them use
// overflow:hidden. Keep the published output unchanged, but make the local
// preview viewport responsive and scrollable when a document is intrinsically
// wider than the available Obsidian pane.
const PREVIEW_LAYOUT_OVERRIDES = `
html,
body {
  width: 100%;
  max-width: none;
  overflow-x: auto;
  overflow-y: auto;
}
.share-layout,
.share-export-target,
.share-stage,
.share-card-shell,
.share-card-shell .card,
.share-card-shell .card-content,
.share-card-shell .card-content-inner {
  min-width: 0;
}
.share-layout,
.share-export-target,
.share-stage,
.share-card-shell {
  max-width: none;
}
.share-card-shell .card {
  overflow: visible;
}
.share-card-shell .card-content,
.share-card-shell .card-content-inner {
  overflow: visible;
}
.share-card-shell .card-content-inner {
  overflow-wrap: anywhere;
  word-break: break-word;
}
.share-card-shell .card-content-inner img,
.share-card-shell .card-content-inner video,
.share-card-shell .card-content-inner svg,
.share-card-shell .card-content-inner canvas {
  max-width: 100%;
  height: auto;
}
.share-card-shell .card-content-inner pre,
.share-card-shell .card-content-inner .markdown-table-wrapper,
.share-card-shell .card-content-inner .table-wrapper {
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
}
.share-card-shell .card-content-inner pre code {
  overflow-wrap: normal;
  word-break: normal;
}
`;

const BLOCKED_TAGS = new Set([
	"SCRIPT",
	"IFRAME",
	"OBJECT",
	"EMBED",
	"FORM",
	"BASE",
	"META",
	"LINK",
]);

function isSafeUrl(value: string, allowData: boolean): boolean {
	const normalized = value.trim().toLowerCase();
	if (!normalized) return true;
	if (normalized.startsWith("#") || normalized.startsWith("/")) return true;
	if (normalized.startsWith("http://") || normalized.startsWith("https://")) return true;
	if (normalized.startsWith("app://") || normalized.startsWith("file://") || normalized.startsWith("blob:")) return true;
	return allowData && normalized.startsWith("data:image/");
}

function sanitizeRenderedHtml(html: string): string {
	const parsed = new DOMParser().parseFromString(html, "text/html");
	for (const element of Array.from(parsed.body.querySelectorAll("*"))) {
		if (BLOCKED_TAGS.has(element.tagName)) {
			element.remove();
			continue;
		}
		for (const attribute of Array.from(element.attributes)) {
			const name = attribute.name.toLowerCase();
			if (name.startsWith("on") || name === "srcset") {
				element.removeAttribute(attribute.name);
				continue;
			}
			if (name === "href" && !isSafeUrl(attribute.value, false)) {
				element.removeAttribute(attribute.name);
			}
			if (name === "src" && !isSafeUrl(attribute.value, true)) {
				element.removeAttribute(attribute.name);
			}
		}
	}
	return parsed.body.innerHTML;
}

export interface LocalPreviewInput {
	app: App;
	file: TFile;
	markdown: string;
	templateId: string;
	themeClass: string;
}

export async function renderLocalTemplatePreview(
	input: LocalPreviewInput,
): Promise<string> {
	const staging = document.body.createDiv({ cls: "htmlto-link-template-preview-staging" });
	const component = new Component();
	component.load();
	try {
		await MarkdownRenderer.render(
			input.app,
			input.markdown,
			staging,
			input.file.path,
			component,
		);
		const content = sanitizeRenderedHtml(staging.innerHTML);
		const meta = getPreviewTemplateMeta(input.templateId);
		const themeClass = getPreviewThemeClass(input.templateId, input.themeClass);
		const classes = ["card", meta.cardClass, themeClass, ...(meta.extraClasses ?? [])]
			.filter(Boolean)
			.join(" ");
		const css = `${FRAME_STYLES}\n${COMMON_TEMPLATE_STYLES}\n${TEMPLATE_STYLES[input.templateId] ?? TEMPLATE_STYLES.plain}\n${PREVIEW_LAYOUT_OVERRIDES}`;

		return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: app: file: blob: http: https:; style-src 'unsafe-inline'; font-src data: app: file: blob: http: https:; connect-src 'none'; frame-src 'none';">
<style>${css}</style>
</head>
<body class="share-page">
<main class="share-layout">
<div class="share-export-target">
<div class="share-stage">
<div class="share-card-shell">
<section class="${classes}" style="width:100%;max-width:100%;">
<section class="card-content"><div class="card-content-inner">${content || '<p class="preview-empty">暂无内容</p>'}</div></section>
</section>
</div>
</div>
</div>
</main>
</body>
</html>`;
	} finally {
		component.unload();
		staging.remove();
	}
}
