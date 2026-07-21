import { MarkdownView, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, type HtmltoLinkSettings } from "./constants";
import { HtmltoLinkSettingTab } from "./settings";
import { publishActiveNote } from "./publish";

export default class HtmltoLinkPlugin extends Plugin {
	settings!: HtmltoLinkSettings;

	async onload() {
		await this.loadSettings();

		// 左侧功能区图标
		this.addRibbonIcon("share", "Publish to htmlto.link", () => {
			void publishActiveNote(this);
		});

		// 命令：发布当前笔记
		this.addCommand({
			id: "publish-current-note",
			name: "Publish current note to htmlto.link",
			checkCallback: (checking: boolean) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) return false;
				if (!checking) {
					void publishActiveNote(this);
				}
				return true;
			},
		});

		// 命令：复制上次设置说明（快速打开设置）
		this.addCommand({
			id: "open-htmlto-link-settings",
			name: "Open htmlto.link settings",
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
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<HtmltoLinkSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
