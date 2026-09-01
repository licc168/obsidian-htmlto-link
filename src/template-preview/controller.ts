import { MarkdownView, TFile } from "obsidian";
import type HtmltoLinkPlugin from "../main";
import { prepareMarkdown, readNoteMarkdown } from "../publish";
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
