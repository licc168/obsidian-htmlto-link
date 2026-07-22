import { App, PluginSettingTab, Setting } from "obsidian";
import type HtmltoLinkPlugin from "./main";
import {
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

		new Setting(containerEl).setName(t("settingsTitle")).setHeading();
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

		// Token 说明：步骤 + 可点击打开网站设置
		const tokenDesc = document.createDocumentFragment();
		tokenDesc.appendChild(document.createTextNode(t("apiTokenDesc")));
		tokenDesc.appendChild(document.createElement("br"));
		const tokenHelp = document.createElement("a");
		tokenHelp.textContent = t("apiTokenHelpLink");
		tokenHelp.href = "https://htmlto.link/settings";
		tokenHelp.target = "_blank";
		tokenHelp.rel = "noopener noreferrer";
		tokenDesc.appendChild(tokenHelp);

		new Setting(containerEl)
			.setName(t("apiTokenName"))
			.setDesc(tokenDesc)
			.addText((text) => {
				text
					.setPlaceholder(t("apiTokenPlaceholder"))
					.setValue(this.plugin.settings.apiToken)
					.onChange(async (value) => {
						this.plugin.settings.apiToken = value
							.trim()
							.replace(/\s+/g, "");
						await this.plugin.saveSettings();
					});
				// 密码式展示，避免 Token 明文常显
				text.inputEl.type = "password";
				text.inputEl.autocomplete = "off";
				text.inputEl.spellcheck = false;
			})
			.addExtraButton((btn) => {
				btn
					.setIcon("external-link")
					.setTooltip(t("apiTokenHelpTooltip"))
					.onClick(() => {
						window.open("https://htmlto.link/settings", "_blank");
					});
			});

		new Setting(containerEl)
			.setName(t("defaultTemplateName"))
			.setDesc(t("defaultTemplateDesc"))
			.addDropdown((dropdown) => {
				for (const item of TEMPLATE_OPTIONS) {
					// id 传给 API；显示名走 i18n
					dropdown.addOption(item.id, t(item.nameKey));
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
						dropdown.addOption(item.value, t(item.labelKey));
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

		new Setting(containerEl).setName(t("tipsTitle")).setHeading();
		const tips = containerEl.createEl("ul");
		const hasToken = this.plugin.settings.apiToken.trim().length > 0;
		tips.createEl("li", {
			text: hasToken ? t("tipTokenFilled") : t("tipTokenGuest"),
		});
		if (!hasToken) {
			const howTo = tips.createEl("li");
			howTo.appendChild(document.createTextNode(t("tipTokenHowToPrefix")));
			const link = document.createElement("a");
			link.textContent = "https://htmlto.link/settings";
			link.href = "https://htmlto.link/settings";
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			howTo.appendChild(link);
			howTo.appendChild(document.createTextNode(t("tipTokenHowToSuffix")));
		}
		tips.createEl("li", { text: t("tipThemes") });
		tips.createEl("li", { text: t("tipImages") });
		tips.createEl("li", { text: t("tipCommand") });
	}
}
