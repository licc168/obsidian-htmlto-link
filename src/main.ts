import { MarkdownView, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, type HtmltoLinkSettings } from "./constants";
import { HtmltoLinkSettingTab } from "./settings";
import { publishActiveNote } from "./publish";
import { initI18n, t } from "./i18n";

export default class HtmltoLinkPlugin extends Plugin {
	settings!: HtmltoLinkSettings;

	async onload() {
		await this.loadSettings();
		initI18n(this.app);

		// 左侧功能区图标
		this.addRibbonIcon("share", t("commandPublish"), () => {
			void publishActiveNote(this);
		});

		// 命令：分享当前笔记（会弹模板/宽度选择）
		this.addCommand({
			id: "publish-current-note",
			name: t("commandPublish"),
			checkCallback: (checking: boolean) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) return false;
				if (!checking) {
					void publishActiveNote(this);
				}
				return true;
			},
		});

		// 命令：打开设置
		this.addCommand({
			id: "open-htmlto-link-settings",
			name: t("commandSettings"),
			callback: () => {
				// @ts-ignore - Obsidian 内部 API，打开设置到本插件
				this.app.setting.open();
				// @ts-ignore
				this.app.setting.openTabById(this.manifest.id);
			},
		});

		this.addSettingTab(new HtmltoLinkSettingTab(this.app, this));

		console.log(`[htmlto-link] loaded v${this.manifest.version}`);
	}

	onunload() {
		console.log("[htmlto-link] unloaded");
	}

	async loadSettings() {
		const data = (await this.loadData()) as Partial<HtmltoLinkSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
		// 确保 noteShares 始终是对象（旧版本可能没有该字段）
		if (!this.settings.noteShares || typeof this.settings.noteShares !== "object") {
			this.settings.noteShares = {};
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
