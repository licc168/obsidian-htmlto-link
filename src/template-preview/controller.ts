import { MarkdownView, Notice, TFile } from "obsidian";
import type HtmltoLinkPlugin from "../main";
import { prepareMarkdown, publishNote, readNoteMarkdown } from "../publish";
import { resolveThemeClassForTemplate } from "../constants";
import { t } from "../i18n";
import { renderLocalTemplatePreview } from "./renderer";
import { TemplatePreviewToolbar } from "./toolbar";

export class TemplatePreviewController {
	private readonly host: HTMLElement;
	private readonly originalContent: HTMLElement;
	private readonly root: HTMLElement;
	private readonly overlay: HTMLElement;
	private readonly iframe: HTMLIFrameElement;
	private readonly toolbar: TemplatePreviewToolbar;
	private templateId = "";
	private themeClass = "";
	private renderToken = 0;
	private debounceTimer: number | null = null;
	private disposed = false;

	constructor(
		private readonly plugin: HtmltoLinkPlugin,
		private readonly view: MarkdownView,
	) {
		const viewContent = view.containerEl.querySelector<HTMLElement>(".view-content");
		if (!viewContent) throw new Error("Markdown view content is unavailable");
		this.host = viewContent;
		this.originalContent = viewContent;
		this.host.addClass("htmlto-link-template-preview-host");

		this.root = this.host.createDiv({ cls: "htmlto-link-template-preview-root" });
		this.toolbar = new TemplatePreviewToolbar(this.root, {
			onTemplateChange: (templateId) => this.selectTemplate(templateId),
			onThemeChange: (themeClass) => this.selectTheme(themeClass),
			onPublish: () => {
				if (this.view.file) void publishNote(this.plugin, this.view.file);
			},
		});
		this.overlay = this.root.createDiv({ cls: "htmlto-link-template-preview-overlay" });
		this.iframe = this.overlay.createEl("iframe", {
			cls: "htmlto-link-template-preview-frame",
			attr: {
				title: t("previewFrameTitle"),
				loading: "eager",
				referrerpolicy: "no-referrer",
				sandbox: "allow-same-origin",
			},
		});
		this.iframe.addEventListener("load", () => {
			this.bindPreviewCopyButtons();
			this.bindPreviewToc();
		});
		this.setPreviewVisible(false);
	}

	destroy(): void {
		this.disposed = true;
		this.renderToken += 1;
		if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
		this.iframe.srcdoc = "";
		this.root.remove();
		this.host.removeClass("htmlto-link-template-preview-host");
	}

	handleEditorChange(info: MarkdownView): void {
		if (this.disposed || info !== this.view || !this.templateId) return;
		this.scheduleRender();
	}

	handleFileChange(file: TFile): void {
		if (this.disposed || !this.templateId || this.view.file?.path !== file.path) return;
		this.scheduleRender();
	}

	focusTemplate(): void {
		this.toolbar.focusTemplate();
	}

	private selectTemplate(templateId: string): void {
		if (this.disposed) return;
		if (!templateId) {
			this.templateId = "";
			this.themeClass = "";
			this.setPreviewVisible(false);
			return;
		}
		this.templateId = templateId;
		this.themeClass = resolveThemeClassForTemplate(templateId, this.themeClass);
		this.toolbar.setValue(this.templateId, this.themeClass);
		this.setPreviewVisible(true);
		this.persistSelection();
		void this.renderNow();
	}

	private selectTheme(themeClass: string): void {
		if (this.disposed || !this.templateId) return;
		this.themeClass = resolveThemeClassForTemplate(this.templateId, themeClass);
		this.persistSelection();
		void this.renderNow();
	}

	private persistSelection(): void {
		this.plugin.settings.templateId = this.templateId;
		this.plugin.settings.themeClass = this.themeClass;
		void this.plugin.saveSettings();
	}

	private scheduleRender(): void {
		if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
		this.debounceTimer = window.setTimeout(() => {
			this.debounceTimer = null;
			void this.renderNow();
		}, 180);
	}

	private async renderNow(): Promise<void> {
		if (this.disposed || !this.templateId || !this.view.file) return;
		const file = this.view.file;
		const token = ++this.renderToken;
		this.toolbar.setBusy(true);
		try {
			const raw = await readNoteMarkdown(this.plugin, file);
			const markdown = prepareMarkdown(raw);
			const srcdoc = await renderLocalTemplatePreview({
				app: this.plugin.app,
				file,
				markdown,
				templateId: this.templateId,
				themeClass: this.themeClass,
			});
			if (this.disposed || token !== this.renderToken) return;
			this.iframe.srcdoc = srcdoc;
		} catch (error) {
			if (this.disposed || token !== this.renderToken) return;
			const message = error instanceof Error ? error.message : String(error);
			this.iframe.srcdoc = this.buildErrorDocument(message);
		} finally {
			if (!this.disposed && token === this.renderToken) this.toolbar.setBusy(false);
		}
	}

	private buildErrorDocument(message: string): string {
		const escaped = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		return `<!doctype html><html lang="zh-CN"><body style="font-family: sans-serif; padding: 24px; color: #b42318; background: #fff7f7;"><strong>${t("previewFailed")}</strong><p>${escaped}</p></body></html>`;
	}

	/**
	 * Obsidian's MarkdownRenderer can add a code-copy button, but its event
	 * listener is not preserved when the rendered HTML is moved into srcdoc.
	 * Re-bind only explicit copy controls in the sandboxed local preview.
	 */
	private bindPreviewCopyButtons(): void {
		const previewDocument = this.iframe.contentDocument;
		if (!previewDocument) return;

		for (const element of Array.from(
			previewDocument.querySelectorAll<HTMLElement>("button, [role='button']"),
		)) {
			if (!this.isCopyButton(element) || element.dataset.htmltoLinkCopyBound) continue;
			element.dataset.htmltoLinkCopyBound = "true";
			element.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				void this.copyPreviewButtonText(element);
			});
		}
	}

	private isCopyButton(element: HTMLElement): boolean {
		const marker = [
			element.className,
			element.getAttribute("aria-label") ?? "",
			element.getAttribute("title") ?? "",
		].join(" ").toLowerCase();
		return (
			marker.includes("copy") ||
			element.hasAttribute("data-copy") ||
			element.hasAttribute("data-copy-text") ||
			element.hasAttribute("data-clipboard-text")
		);
	}

	private async copyPreviewButtonText(element: HTMLElement): Promise<void> {
		const explicitText =
			element.getAttribute("data-copy") ??
			element.getAttribute("data-copy-text") ??
			element.getAttribute("data-clipboard-text");
		const codeText = element.closest("pre")?.querySelector("code")?.textContent;
		const text = (explicitText ?? codeText ?? "").trimEnd();
		if (!text) {
			new Notice(t("previewCopyFailed"));
			return;
		}

		try {
			await navigator.clipboard.writeText(text);
			this.showCopyFeedback(element);
		} catch {
			new Notice(t("previewCopyFailed"));
		}
	}

	private showCopyFeedback(element: HTMLElement): void {
		const originalLabel = element.dataset.htmltoLinkCopyLabel ??
			element.getAttribute("aria-label") ??
			element.getAttribute("title") ??
			"";
		element.dataset.htmltoLinkCopyLabel = originalLabel;
		element.classList.add("htmlto-link-preview-copy-success");
		element.setAttribute("aria-label", t("previewCopied"));
		element.setAttribute("title", t("previewCopied"));
		new Notice(t("previewCopied"));

		window.setTimeout(() => {
			if (!element.isConnected) return;
			element.classList.remove("htmlto-link-preview-copy-success");
			if (originalLabel) {
				element.setAttribute("aria-label", originalLabel);
				element.setAttribute("title", originalLabel);
			} else {
				element.removeAttribute("aria-label");
				element.removeAttribute("title");
			}
		}, 1600);
	}

	private bindPreviewToc(): void {
		const previewDocument = this.iframe.contentDocument;
		if (!previewDocument) return;

		const toc = previewDocument.querySelector<HTMLElement>("[data-htmlto-link-toc]");
		const toggle = previewDocument.querySelector<HTMLButtonElement>(
			"[data-htmlto-link-toc-toggle]",
		);
		const nav = previewDocument.querySelector<HTMLElement>("[data-htmlto-link-toc-nav]");
		if (!toc || !toggle || !nav) return;

		toggle.addEventListener("click", () => {
			const collapsed = toc.classList.toggle("is-collapsed");
			toc.closest<HTMLElement>(".share-page-grid")?.classList.toggle(
				"share-toc-collapsed",
				collapsed,
			);
			toggle.setAttribute("aria-expanded", String(!collapsed));
			toggle.setText(collapsed ? t("previewTocExpand") : t("previewTocCollapse"));
			nav.hidden = collapsed;
		});

		for (const link of Array.from(
			nav.querySelectorAll<HTMLAnchorElement>("[data-htmlto-link-toc-link]"),
		)) {
			link.addEventListener("click", (event) => {
				event.preventDefault();
				for (const item of Array.from(nav.children)) {
					if (item.getAttribute("aria-current") === "true") {
						item.removeAttribute("aria-current");
					}
				}
				link.setAttribute("aria-current", "true");

				const targetId = link.getAttribute("href")?.slice(1);
				const target = targetId ? previewDocument.getElementById(targetId) : null;
				if (target) {
					target.scrollIntoView({
						behavior: "auto",
						block: "start",
						inline: "nearest",
					});
				}
			});
		}
	}

	private setPreviewVisible(visible: boolean): void {
		this.overlay.toggleClass("htmlto-link-template-preview-visible", visible);
		this.root.toggleClass("htmlto-link-template-preview-active", visible);
		this.originalContent.toggleClass("htmlto-link-template-preview-content-hidden", visible);
		if (!visible) {
			this.iframe.srcdoc = "";
			this.toolbar.setValue("", "");
		}
	}
}

export function canMountTemplatePreview(view: MarkdownView): boolean {
	return Boolean(view.file && view.containerEl.querySelector(".view-content"));
}
