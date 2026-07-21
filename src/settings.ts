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

		// 校正当前模板对应的主题
		this.plugin.settings.themeClass = resolveThemeClassForTemplate(
			this.plugin.settings.templateId,
			this.plugin.settings.themeClass,
		);

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
						this.plugin.settings.apiBaseUrl = value
							.trim()
							.replace(/\/+$/, "");
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("API Token")
			.setDesc(
				"留空则作为游客发布，分享链接仅保留 24 小时。填入网站「设置 → API Token」可让链接归属你的账号并享受更长的有效期。",
			)
			.addText((text) =>
				text
					.setPlaceholder("粘贴你的 API Token（可留空）")
					.setValue(this.plugin.settings.apiToken)
					.onChange(async (value) => {
						this.plugin.settings.apiToken = value
							.trim()
							.replace(/\s+/g, "");
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
				.setName("默认主题")
				.setDesc("当前模板支持多种主题配色")
				.addDropdown((dropdown) => {
					for (const item of themes) {
						dropdown.addOption(item.value, item.label);
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
			.setName("发布时选择模板和宽度")
			.setDesc(
				"开启后每次发布弹出选择框；选过一次会自动记住，下次默认选中上次的模板和宽度",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showOptionsOnPublish)
					.onChange(async (value) => {
						this.plugin.settings.showOptionsOnPublish = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("发布后自动复制链接")
			.setDesc(
				"成功弹窗打开时，是否同时自动复制链接（弹窗里仍可再点「复制链接」）",
			)
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
		const hasToken = this.plugin.settings.apiToken.trim().length > 0;
		tips.createEl("li", {
			text: hasToken
				? "已填写 API Token：分享链接归属于你的账号，按套餐享受更长有效期。"
				: "未填写 Token 时走游客模式：分享链接仅保留 24 小时。",
		});
		tips.createEl("li", {
			text: "仅「备忘录 / 波普艺术 / 线圈笔记本」支持多主题，其他模板为固定样式。",
		});
		tips.createEl("li", {
			text: "本地图片暂不自动上传，建议使用外链图或先上传到图床。",
		});
		tips.createEl("li", {
			text: "命令面板搜索「Publish to htmlto.link」即可发布当前笔记。",
		});
	}
}
