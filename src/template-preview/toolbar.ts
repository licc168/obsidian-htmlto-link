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
}

/** Compact, native-select based controls mounted in a Markdown view. */
export class TemplatePreviewToolbar {
	readonly root: HTMLElement;
	private readonly templateSelect: HTMLSelectElement;
	private readonly themeField: HTMLElement;
	private readonly themeSelect: HTMLSelectElement;
	private readonly publishButton: HTMLButtonElement;
	private handlers: TemplatePreviewToolbarHandlers;

	constructor(parent: HTMLElement, handlers: TemplatePreviewToolbarHandlers) {
		this.handlers = handlers;
		this.root = parent.createDiv({ cls: "htmlto-link-template-preview-toolbar" });

		const templateField = this.createField(
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

		this.publishButton = this.root.createEl("button", {
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

	focusTemplate(): void {
		this.templateSelect.focus();
	}

	private createField(labelText: string, ariaLabel: string): HTMLElement {
		const field = this.root.createDiv({ cls: "htmlto-link-template-preview-field" });
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
