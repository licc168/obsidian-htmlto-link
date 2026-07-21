import { App, PluginSettingTab, Setting } from "obsidian";
import type HtmltoLinkPlugin from "./main";
import {
	CARD_WIDTH_OPTIONS,
	DEFAULT_SETTINGS,
	TEMPLATE_OPTIONS,
	type HtmltoLinkSettings,
} from "./constants";

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

		containerEl.createEl("h2", { text: "Htmlto.link Publisher" });
		containerEl.createEl("p", {
			text: "将当前 Obsidian 笔记一键发布为 htmlto.link 精美分享页。",
			cls: "setting-item-description",
		});

		new Setting(containerEl)
			.setName("API 地址")
			.setDesc("默认 https://htmlto.link，自建部署可改成你的域名")
			.addText((text) =>
				text
					.setPlaceholder("https://htmlto.link")
					.setValue(this.plugin.settings.apiBaseUrl)
					.onChange(async (value) => {
						this.plugin.settings.apiBaseUrl = value.trim().replace(/\/+$/, "");
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("默认模板")
			.setDesc("发布时使用的卡片模板")
			.addDropdown((dropdown) => {
				for (const item of TEMPLATE_OPTIONS) {
					dropdown.addOption(item.id, item.name);
				}
				dropdown
					.setValue(this.plugin.settings.templateId)
					.onChange(async (value) => {
						this.plugin.settings.templateId = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("默认主题 class")
			.setDesc("可选。例如 bright-mode、candy-mode、blue-mode；留空使用模板默认主题")
			.addText((text) =>
				text
					.setPlaceholder("bright-mode")
					.setValue(this.plugin.settings.themeClass)
					.onChange(async (value) => {
						this.plugin.settings.themeClass = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("卡片宽度")
			.setDesc("分享页卡片宽度（像素）")
			.addDropdown((dropdown) => {
				for (const item of CARD_WIDTH_OPTIONS) {
					dropdown.addOption(String(item.value), item.label);
				}
				dropdown
					.setValue(String(this.plugin.settings.cardWidth))
					.onChange(async (value) => {
						this.plugin.settings.cardWidth = Number(value) || 440;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("发布后复制链接")
			.setDesc("成功后自动复制公开链接到剪贴板")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.copyLinkOnSuccess)
					.onChange(async (value) => {
						this.plugin.settings.copyLinkOnSuccess = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("发布后打开浏览器")
			.setDesc("成功后在系统浏览器中打开分享页")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openInBrowser)
					.onChange(async (value) => {
						this.plugin.settings.openInBrowser = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("在笔记末尾追加链接")
			.setDesc("发布成功后，在当前笔记底部追加分享链接")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.appendLinkToNote)
					.onChange(async (value) => {
						this.plugin.settings.appendLinkToNote = value;
						await this.plugin.saveSettings();
					}),
			);

		containerEl.createEl("h3", { text: "说明" });
		const tips = containerEl.createEl("ul");
		tips.createEl("li", {
			text: "当前版本走游客分享接口，链接有有效期（与网站一致）。",
		});
		tips.createEl("li", {
			text: "本地图片暂不自动上传，建议使用外链图或先上传到图床。",
		});
		tips.createEl("li", {
			text: "命令面板搜索「Publish to htmlto.link」即可发布当前笔记。",
		});
	}
}
