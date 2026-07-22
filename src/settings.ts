import { App, PluginSettingTab, Setting } from "obsidian";
import type HtmltoLinkPlugin from "./main";
import {
	CARD_WIDTH_OPTIONS,
	DEFAULT_SETTINGS,
	TEMPLATE_OPTIONS,
	getTemplateThemes,
	hasMultiThemes,
	resolveThemeClassForTemplate,
	type HtmltoLinkSettings,
	type PluginLanguage,
} from "./constants";
import { t } from "./i18n";

export { DEFAULT_SETTINGS };
export type { HtmltoLinkSettings };

export class HtmltoLinkSettingTab extends PluginSettingTab {
	plugin: HtmltoLinkPlugin;

	constructor(app: App, plugin: HtmltoLinkPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// 校正当前模板对应的主题
		this.plugin.settings.themeClass = resolveThemeClassForTemplate(
			this.plugin.settings.templateId,
			this.plugin.settings.themeClass,
		);

		containerEl.createEl("h2", { text: t("settingsTitle") });
		containerEl.createEl("p", {
			text: t("settingsDesc"),
			cls: "setting-item-description",
		});

		// 界面语言（可手动中英文切换）
		new Setting(containerEl)
			.setName(t("languageName"))
			.setDesc(t("languageDesc"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("auto", t("languageAuto"))
					.addOption("en", t("languageEn"))
					.addOption("zh", t("languageZh"))
					.setValue(this.plugin.settings.language || "auto")
					.onChange(async (value) => {
						this.plugin.settings.language = value as PluginLanguage;
						await this.plugin.saveSettings();
						this.plugin.applyLanguage();
						// 立即用新语言重绘设置页
						this.display();
					});
			});

		new Setting(containerEl)
			.setName(t("apiUrlName"))
			.setDesc(t("apiUrlDesc"))
			.addText((text) =>
				text
					.setPlaceholder("https://htmlto.link")
					.setValue(this.plugin.settings.apiBaseUrl)
					.onChange(async (value) => {
						this.plugin.settings.apiBaseUrl = value
							.trim()
							.replace(/\/+$/, "");
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t("apiTokenName"))
			.setDesc(t("apiTokenDesc"))
			.addText((text) =>
				text
					.setPlaceholder(t("apiTokenName"))
					.setValue(this.plugin.settings.apiToken)
					.onChange(async (value) => {
						this.plugin.settings.apiToken = value
							.trim()
							.replace(/\s+/g, "");
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t("defaultTemplateName"))
			.setDesc(t("defaultTemplateDesc"))
			.addDropdown((dropdown) => {
				for (const item of TEMPLATE_OPTIONS) {
					// id 传给 API；显示名走 i18n
					dropdown.addOption(item.id, t(item.nameKey as any));
				}
				dropdown
					.setValue(this.plugin.settings.templateId)
					.onChange(async (value) => {
						this.plugin.settings.templateId = value;
						this.plugin.settings.themeClass =
							resolveThemeClassForTemplate(
								value,
								this.plugin.settings.themeClass,
							);
						await this.plugin.saveSettings();
						// 主题选项依赖模板，重绘设置页
						this.display();
					});
			});

		const multiTheme = hasMultiThemes(this.plugin.settings.templateId);
		const themes = getTemplateThemes(this.plugin.settings.templateId);

		if (multiTheme) {
			new Setting(containerEl)
				.setName(t("defaultThemeName"))
				.setDesc(t("defaultThemeDesc"))
				.addDropdown((dropdown) => {
					for (const item of themes) {
						// value 传给 API；显示名走 i18n
						dropdown.addOption(item.value, t(item.labelKey as any));
					}
					dropdown
						.setValue(this.plugin.settings.themeClass)
						.onChange(async (value) => {
							this.plugin.settings.themeClass = value;
							await this.plugin.saveSettings();
						});
				});
		}
		// 无多主题时不显示主题选项

		new Setting(containerEl)
			.setName(t("cardWidthName"))
			.setDesc(t("cardWidthDesc"))
			.addDropdown((dropdown) => {
				for (const item of CARD_WIDTH_OPTIONS) {
					dropdown.addOption(
						String(item.value),
						t(item.labelKey as any),
					);
				}
				dropdown
					.setValue(String(this.plugin.settings.cardWidth))
					.onChange(async (value) => {
						this.plugin.settings.cardWidth = Number(value) || 440;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName(t("showOptionsName"))
			.setDesc(t("showOptionsDesc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showOptionsOnPublish)
					.onChange(async (value) => {
						this.plugin.settings.showOptionsOnPublish = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t("copyOnSuccessName"))
			.setDesc(t("copyOnSuccessDesc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.copyLinkOnSuccess)
					.onChange(async (value) => {
						this.plugin.settings.copyLinkOnSuccess = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t("openBrowserName"))
			.setDesc(t("openBrowserDesc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openInBrowser)
					.onChange(async (value) => {
						this.plugin.settings.openInBrowser = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t("writeFrontmatterName"))
			.setDesc(t("writeFrontmatterDesc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.writeShareToNote)
					.onChange(async (value) => {
						this.plugin.settings.writeShareToNote = value;
						await this.plugin.saveSettings();
					}),
			);

		containerEl.createEl("h3", { text: t("tipsTitle") });
		const tips = containerEl.createEl("ul");
		const hasToken = this.plugin.settings.apiToken.trim().length > 0;
		tips.createEl("li", {
			text: hasToken ? t("tipTokenFilled") : t("tipTokenGuest"),
		});
		tips.createEl("li", { text: t("tipThemes") });
		tips.createEl("li", { text: t("tipImages") });
		tips.createEl("li", { text: t("tipCommand") });
	}
}
