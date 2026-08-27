import {
	App,
	PluginSettingTab,
	Setting,
	requireApiVersion,
	type SettingDefinition,
	type SettingDefinitionItem,
} from "obsidian";
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

	getSettingDefinitions(): SettingDefinitionItem[] {
		const refresh = () => {
			if (requireApiVersion("1.13.0")) this.update();
		};
		return [
			{
				type: "group",
				heading: t("settingsTitle"),
				items: [
					{
						name: t("settingsTitle"),
						desc: t("settingsDesc"),
						searchable: false,
					},
					{
						name: t("languageName"),
						desc: t("languageDesc"),
						render: (setting) => {
							setting.addDropdown((dropdown) => {
								dropdown
									.addOption("auto", t("languageAuto"))
									.addOption("en", t("languageEn"))
									.addOption("zh", t("languageZh"))
									.setValue(this.plugin.settings.language || "auto")
									.onChange(async (value) => {
										if (!isPluginLanguage(value)) return;
										this.plugin.settings.language = value;
										await this.plugin.saveSettings();
										this.plugin.applyLanguage();
										refresh();
									});
							});
						},
					},
					{
						name: t("apiTokenName"),
						desc: this.createTokenDescription(),
						render: (setting) => this.addTokenControl(setting),
					},
					{
						name: t("defaultTemplateName"),
						desc: t("defaultTemplateDesc"),
						render: (setting) => {
							setting.addDropdown((dropdown) => {
								for (const item of TEMPLATE_OPTIONS) {
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
										refresh();
									});
							});
						},
					},
					{
						name: t("defaultThemeName"),
						desc: t("defaultThemeDesc"),
						visible: () => hasMultiThemes(this.plugin.settings.templateId),
						render: (setting) => {
							const themes = getTemplateThemes(this.plugin.settings.templateId);
							setting.addDropdown((dropdown) => {
								for (const item of themes) {
									dropdown.addOption(item.value, t(item.labelKey));
								}
								dropdown
									.setValue(this.plugin.settings.themeClass)
									.onChange(async (value) => {
										this.plugin.settings.themeClass = value;
										await this.plugin.saveSettings();
									});
							});
						},
					},
					this.createToggleDefinition(
						"showOptionsName",
						"showOptionsDesc",
						"showOptionsOnPublish",
					),
					this.createToggleDefinition(
						"copyOnSuccessName",
						"copyOnSuccessDesc",
						"copyLinkOnSuccess",
					),
					this.createToggleDefinition(
						"openBrowserName",
						"openBrowserDesc",
						"openInBrowser",
					),
					this.createToggleDefinition(
						"writeFrontmatterName",
						"writeFrontmatterDesc",
						"writeShareToNote",
					),
				],
			},
			{
				type: "group",
				heading: t("tipsTitle"),
				items: this.createTipDefinitions(),
			},
		];
	}

	display(): void {
		this.renderLegacySettings();
	}

	private renderLegacySettings(): void {
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
						if (!isPluginLanguage(value)) return;
						this.plugin.settings.language = value;
						await this.plugin.saveSettings();
						this.plugin.applyLanguage();
						// 立即用新语言重绘设置页
						this.renderLegacySettings();
					});
			});

		// Token 说明：步骤 + 可点击打开网站设置
		const tokenDesc = this.createTokenDescription();

		const tokenSetting = new Setting(containerEl)
			.setName(t("apiTokenName"))
			.setDesc(tokenDesc);
		this.addTokenControl(tokenSetting);

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
						this.renderLegacySettings();
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
			howTo.appendText(t("tipTokenHowToPrefix"));
			howTo.createEl("a", {
				text: "Htmlto.link settings",
				href: "https://htmlto.link/settings",
				attr: { target: "_blank", rel: "noopener noreferrer" },
			});
			howTo.appendText(t("tipTokenHowToSuffix"));
		}
		tips.createEl("li", { text: t("tipThemes") });
		tips.createEl("li", { text: t("tipImages") });
		tips.createEl("li", { text: t("tipCommand") });
	}

	private createTokenDescription(): DocumentFragment {
		return createFragment((fragment) => {
			fragment.appendText(t("apiTokenDesc"));
			fragment.createEl("br");
			fragment.createEl("a", {
				text: t("apiTokenHelpLink"),
				href: "https://htmlto.link/settings",
				attr: { target: "_blank", rel: "noopener noreferrer" },
			});
		});
	}

	private addTokenControl(setting: Setting): void {
		setting
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
				text.inputEl.type = "password";
				text.inputEl.autocomplete = "off";
				text.inputEl.spellcheck = false;
			})
			.addExtraButton((button) => {
				button
					.setIcon("external-link")
					.setTooltip(t("apiTokenHelpTooltip"))
					.onClick(() => {
						window.open("https://htmlto.link/settings", "_blank");
					});
			});
	}

	private createToggleDefinition(
		nameKey: string,
		descKey: string,
		settingKey:
			| "showOptionsOnPublish"
			| "copyLinkOnSuccess"
			| "openInBrowser"
			| "writeShareToNote",
	): SettingDefinition {
		return {
			name: t(nameKey),
			desc: t(descKey),
			render: (setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings[settingKey])
						.onChange(async (value) => {
							this.plugin.settings[settingKey] = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		};
	}

	private createTipDefinitions(): SettingDefinition[] {
		const hasToken = this.plugin.settings.apiToken.trim().length > 0;
		return [
			{
				name: hasToken ? t("tipTokenFilled") : t("tipTokenGuest"),
			},
			...(!hasToken
				? [{ name: `${t("tipTokenHowToPrefix")}htmlto.link/settings${t("tipTokenHowToSuffix")}` }]
				: []),
			{ name: t("tipThemes") },
			{ name: t("tipImages") },
			{ name: t("tipCommand") },
		];
	}
}

function isPluginLanguage(value: string): value is PluginLanguage {
	return value === "auto" || value === "en" || value === "zh";
}
