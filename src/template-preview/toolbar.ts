import {
	TEMPLATE_OPTIONS,
	getTemplateThemes,
	resolveThemeClassForTemplate,
} from "../constants";
import { t } from "../i18n";

export interface TemplatePreviewToolbarHandlers {
	onTemplateChange: (templateId: string) => void;
	onThemeChange: (themeClass: string) => void;
	onPublish: () => void;
	onOpenSite: () => void;
	onCollapsedChange: (collapsed: boolean) => void;
}

/** Compact, native-select based controls mounted in a Markdown view. */
export class TemplatePreviewToolbar {
	readonly root: HTMLElement;
	private readonly templateSelect: HTMLSelectElement;
	private readonly themeField: HTMLElement;
	private readonly themeSelect: HTMLSelectElement;
	private readonly publishButton: HTMLButtonElement;
	private readonly siteLink: HTMLAnchorElement;
	private readonly collapseButton: HTMLButtonElement;
	private collapsed = false;
	private handlers: TemplatePreviewToolbarHandlers;

	constructor(parent: HTMLElement, handlers: TemplatePreviewToolbarHandlers) {
		this.handlers = handlers;
		this.root = parent.createDiv({ cls: "htmlto-link-template-preview-toolbar" });
		const body = this.root.createDiv({ cls: "htmlto-link-template-preview-toolbar-body" });

		const templateField = this.createField(body,
			t("previewTemplateLabel"),
			t("previewTemplateAriaLabel"),
		);
		this.templateSelect = templateField.createEl("select", {
			cls: "htmlto-link-template-preview-select",
			attr: { "aria-label": t("previewTemplateAriaLabel") },
		});
		this.templateSelect.addEventListener("change", () => {
			this.handlers.onTemplateChange(this.templateSelect.value);
		});

		this.themeField = this.createField(
			body,
			t("previewThemeLabel"),
			t("previewThemeAriaLabel"),
		);
		this.themeSelect = this.themeField.createEl("select", {
			cls: "htmlto-link-template-preview-select",
			attr: { "aria-label": t("previewThemeAriaLabel") },
		});
		this.themeSelect.addEventListener("change", () => {
			this.handlers.onThemeChange(this.themeSelect.value);
		});

		this.publishButton = body.createEl("button", {
			text: t("previewPublishButton"),
			cls: "htmlto-link-template-preview-publish mod-cta",
			attr: {
				type: "button",
				"aria-label": t("previewPublishAriaLabel"),
			},
		});
		this.publishButton.addEventListener("click", () => {
			this.handlers.onPublish();
		});

		this.siteLink = body.createEl("a", {
			text: t("previewSiteLink"),
			cls: "htmlto-link-template-preview-site",
			attr: {
				href: "https://htmlto.link",
				target: "_blank",
				rel: "noopener noreferrer",
				"aria-label": t("previewSiteLinkAria"),
			},
		});
		this.siteLink.addEventListener("click", (event) => {
			event.preventDefault();
			this.handlers.onOpenSite();
		});

		this.collapseButton = this.root.createEl("button", {
			cls: "htmlto-link-template-preview-collapse",
			attr: { type: "button" },
		});
		const collapseIcon = this.collapseButton.createSvg("svg", {
			attr: {
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				"stroke-width": "2",
				"stroke-linecap": "round",
				"stroke-linejoin": "round",
				"aria-hidden": "true",
			},
		});
		collapseIcon.createSvg("path", { attr: { d: "m9 6 6 6-6 6" } });
		this.collapseButton.addEventListener("click", () => {
			this.handlers.onCollapsedChange(!this.collapsed);
		});
		this.applyCollapsed(false);
		this.refreshTemplateOptions("");
		this.refreshThemeOptions("", "");
	}

	setHandlers(handlers: TemplatePreviewToolbarHandlers): void {
		this.handlers = handlers;
	}

	setValue(templateId: string, themeClass: string): void {
		this.refreshTemplateOptions(templateId);
		this.refreshThemeOptions(templateId, themeClass);
	}

	setBusy(isBusy: boolean): void {
		this.templateSelect.disabled = isBusy;
		this.themeSelect.disabled = isBusy;
		this.publishButton.disabled = isBusy;
		this.publishButton.setText(
			isBusy ? t("previewPublishingButton") : t("previewPublishButton"),
		);
	}

	setSiteUrl(url: string): void {
		this.siteLink.href = url;
	}

	setCollapsed(collapsed: boolean): void {
		this.applyCollapsed(collapsed);
	}

	isCollapsed(): boolean {
		return this.collapsed;
	}

	focusTemplate(): void {
		this.templateSelect.focus();
	}

	private applyCollapsed(collapsed: boolean): void {
		this.collapsed = collapsed;
		this.root.toggleClass("is-collapsed", collapsed);
		const label = t(collapsed ? "previewToolbarExpand" : "previewToolbarCollapse");
		this.collapseButton.setAttribute("aria-expanded", collapsed ? "false" : "true");
		this.collapseButton.setAttribute("aria-label", label);
		this.collapseButton.setAttribute("title", label);
		if (!collapsed) return;
		const active = document.activeElement;
		if (active instanceof HTMLElement && this.root.contains(active) && active !== this.collapseButton) {
			active.blur();
		}
	}

	private createField(parent: HTMLElement, labelText: string, ariaLabel: string): HTMLElement {
		const field = parent.createDiv({ cls: "htmlto-link-template-preview-field" });
		const label = field.createEl("label", {
			text: labelText,
			cls: "htmlto-link-template-preview-label",
		});
		label.setAttribute("aria-label", ariaLabel);
		return field;
	}

	private refreshTemplateOptions(value: string): void {
		this.templateSelect.empty();
		this.templateSelect.add(new Option(t("previewOriginal"), ""));
		for (const item of TEMPLATE_OPTIONS) {
			this.templateSelect.add(new Option(t(item.nameKey), item.id));
		}
		this.templateSelect.value = value;
	}

	private refreshThemeOptions(templateId: string, themeClass: string): void {
		const themes = getTemplateThemes(templateId);
		this.themeSelect.empty();
		for (const item of themes) {
			this.themeSelect.add(new Option(t(item.labelKey), item.value));
		}
		const resolved = resolveThemeClassForTemplate(templateId, themeClass);
		this.themeSelect.value = resolved;
		this.themeField.toggleClass("htmlto-link-template-preview-hidden", themes.length === 0);
		this.themeSelect.disabled = themes.length === 0;
	}
}
