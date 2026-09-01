import { App, Component, MarkdownRenderer, TFile } from "obsidian";
import { COMMON_TEMPLATE_STYLES, TEMPLATE_STYLES } from "./generated/template-styles";
import {
	getPreviewTemplateMeta,
	getPreviewThemeClass,
} from "./registry";
import { t } from "../i18n";

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
.share-page-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, 220px); gap: 24px; align-items: start; width: min(100%, 70rem); margin: 0 auto; }
.share-export-target { display: flex; justify-content: center; min-height: calc(100vh - 72px); min-width: 0; }
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
.share-toc { position: sticky; top: 24px; max-height: calc(100vh - 48px); overflow: auto; padding: 12px; border: 1px solid rgba(100, 116, 139, 0.24); border-radius: 14px; background: rgba(255, 255, 255, 0.82); color: #334155; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); }
.share-toc-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.share-toc-title { font-size: 13px; font-weight: 700; }
.share-toc-toggle { min-height: 30px; padding: 4px 8px; border: 1px solid rgba(100, 116, 139, 0.25); border-radius: 7px; background: rgba(248, 250, 252, 0.9); color: #475569; cursor: pointer; font-size: 11px; }
.share-toc-toggle:focus-visible, .share-toc-link:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
.share-toc-nav { display: grid; gap: 3px; margin-top: 10px; }
.share-toc-link { display: block; padding: 6px 7px; padding-left: calc(7px + (var(--toc-level) - 1) * 12px); border-radius: 7px; color: #64748b; font-size: 12px; line-height: 1.45; text-decoration: none; overflow-wrap: anywhere; }
.share-toc-link:hover, .share-toc-link[aria-current="true"] { background: rgba(99, 102, 241, 0.1); color: #4338ca; }
.share-page-grid.share-toc-collapsed { grid-template-columns: minmax(0, 1fr) 44px; }
.share-toc.is-collapsed { padding: 8px; }
.share-toc.is-collapsed .share-toc-header { flex-direction: column; }
.share-toc.is-collapsed .share-toc-title { writing-mode: vertical-rl; }
.share-toc.is-collapsed .share-toc-toggle { padding: 4px 6px; }
.share-toc.is-collapsed .share-toc-nav { display: none; }
.share-toc-link.is-active { background: rgba(99, 102, 241, 0.1); color: #4338ca; }
.share-card-shell .card h1,
.share-card-shell .card h2,
.share-card-shell .card h3,
.share-card-shell .card h4,
.share-card-shell .card h5,
.share-card-shell .card h6 { scroll-margin-top: 16px; }
@media (max-width: 640px) {
  .share-layout { padding: 16px 12px 32px; }
}
@media (max-width: 800px) {
  .share-page-grid, .share-page-grid.share-toc-collapsed { display: block; }
  .share-toc { position: static; max-height: none; margin-bottom: 16px; }
  .share-toc.is-collapsed .share-toc-header { flex-direction: row; }
  .share-toc.is-collapsed .share-toc-title { writing-mode: horizontal-tb; }
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
.share-page-grid,
.share-export-target,
.share-stage,
.share-card-shell {
  max-width: none;
}
.share-page-grid {
  width: min(100%, 70rem);
  max-width: 70rem;
}
.share-page-grid.share-page-grid-no-toc { grid-template-columns: minmax(0, 1fr); }
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
.htmlto-link-preview-copy-success {
  outline: 2px solid #22c55e !important;
  outline-offset: 2px;
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

interface PreviewContentWithToc {
	contentHtml: string;
	tocHtml: string;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function slugifyHeading(value: string, index: number): string {
	const slug = value
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^\w\u3400-\u9fff-]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug || `section-${index + 1}`;
}

function addHeadingAnchorsAndBuildToc(html: string): PreviewContentWithToc {
	const parsed = new DOMParser().parseFromString(
		`<div data-preview-content-root="true">${html}</div>`,
		"text/html",
	);
	const root = parsed.body.firstElementChild as HTMLElement | null;
	if (!root) return { contentHtml: html, tocHtml: "" };

	const usedIds = new Map<string, number>();
	const items: Array<{ id: string; label: string; level: number }> = [];
	for (const [index, heading] of Array.from(
		root.querySelectorAll<HTMLHeadingElement>("h1, h2, h3, h4, h5, h6"),
	).entries()) {
		const label = heading.textContent?.trim();
		if (!label) continue;
		const baseId = slugifyHeading(label, index);
		const count = (usedIds.get(baseId) ?? 0) + 1;
		usedIds.set(baseId, count);
		const id = count === 1 ? baseId : `${baseId}-${count}`;
		heading.id = id;
		items.push({
			id,
			label,
			level: Number(heading.tagName.slice(1)),
		});
	}

	const tocHtml = items
		.map(
			(item) =>
				`<a class="share-toc-link" data-htmlto-link-toc-link href="#${escapeHtml(item.id)}" style="--toc-level:${item.level}">${escapeHtml(item.label)}</a>`,
		)
		.join("");
	return { contentHtml: root.innerHTML, tocHtml };
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
		const content = addHeadingAnchorsAndBuildToc(
			sanitizeRenderedHtml(staging.innerHTML),
		);
		const meta = getPreviewTemplateMeta(input.templateId);
		const themeClass = getPreviewThemeClass(input.templateId, input.themeClass);
		const classes = ["card", meta.cardClass, themeClass, ...(meta.extraClasses ?? [])]
			.filter(Boolean)
			.join(" ");
		const css = `${FRAME_STYLES}\n${COMMON_TEMPLATE_STYLES}\n${TEMPLATE_STYLES[input.templateId] ?? TEMPLATE_STYLES.plain}\n${PREVIEW_LAYOUT_OVERRIDES}`;

		const toc = content.tocHtml
			? `<aside class="share-toc" data-htmlto-link-toc aria-label="${escapeHtml(t("previewTocAriaLabel"))}">
<div class="share-toc-header">
<span class="share-toc-title">${escapeHtml(t("previewTocTitle"))}</span>
<button type="button" class="share-toc-toggle" data-htmlto-link-toc-toggle aria-expanded="true" aria-controls="share-preview-toc-nav">${escapeHtml(t("previewTocCollapse"))}</button>
</div>
<nav id="share-preview-toc-nav" class="share-toc-nav" data-htmlto-link-toc-nav aria-label="${escapeHtml(t("previewTocAriaLabel"))}">${content.tocHtml}</nav>
</aside>`
			: "";

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
<div class="share-page-grid${content.tocHtml ? "" : " share-page-grid-no-toc"}">
<div class="share-export-target">
<div class="share-stage">
<div class="share-card-shell">
<section class="${classes}" style="width:100%;max-width:100%;">
<section class="card-content"><div class="card-content-inner">${content.contentHtml || '<p class="preview-empty">暂无内容</p>'}</div></section>
</section>
</div>
</div>
</div>
${toc}
</div>
</main>
</body>
</html>`;
	} finally {
		component.unload();
		staging.remove();
	}
}
