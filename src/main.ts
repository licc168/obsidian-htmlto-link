import { MarkdownView, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, type HtmltoLinkSettings } from "./constants";
import { HtmltoLinkSettingTab } from "./settings";
import { publishActiveNote, deleteShareActiveNote } from "./publish";
import { initI18n, t } from "./i18n";

export default class HtmltoLinkPlugin extends Plugin {
	settings!: HtmltoLinkSettings;

	async onload() {
		await this.loadSettings();
		// 按设置初始化语言（auto 跟随 Obsidian，也可手动 en/zh）
		initI18n(this.app, this.settings.language ?? "auto");

		// 左侧功能区图标
		this.addRibbonIcon("share", t("commandPublish"), () => {
			void publishActiveNote(this);
		});

		// 命令：分享当前笔记（会弹模板/宽度选择）
		this.addCommand({
			id: "publish-current",
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

		// 命令：删除当前笔记的分享
		this.addCommand({
			id: "delete-current-share",
			name: t("commandDeleteShare"),
			checkCallback: (checking: boolean) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) return false;
				if (!checking) {
					void deleteShareActiveNote(this);
				}
				return true;
			},
		});

		// 命令：打开设置
		this.addCommand({
			id: "open-settings",
			name: t("commandSettings"),
			callback: () => {
				this.app.setting.open();
				this.app.setting.openTabById(this.manifest.id);
			},
		});

		this.addSettingTab(new HtmltoLinkSettingTab(this.app, this));

		// plugin loaded
	}

	/** 切换语言后重新应用 i18n（设置页会立即刷新；命令名需重载插件） */
	applyLanguage(): void {
		initI18n(this.app, this.settings.language ?? "auto");
	}

	onunload() {
		// plugin unloaded
	}

	async loadSettings() {
		const data = (await this.loadData()) as Partial<HtmltoLinkSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
		// 确保 noteShares 始终是对象（旧版本可能没有该字段）
		if (!this.settings.noteShares || typeof this.settings.noteShares !== "object") {
			this.settings.noteShares = {};
		}
		// 旧版本无 language 字段时回退 auto
		if (
			this.settings.language !== "auto" &&
			this.settings.language !== "en" &&
			this.settings.language !== "zh"
		) {
			this.settings.language = "auto";
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
