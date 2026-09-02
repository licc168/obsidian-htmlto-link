import { MarkdownView, Plugin, TFile } from "obsidian";
import { DEFAULT_SETTINGS, type HtmltoLinkSettings } from "./constants";
import { HtmltoLinkSettingTab } from "./settings";
import {
	publishActiveNote,
	publishNote,
	deleteShareActiveNote,
	deleteShareNote,
} from "./publish";
import { initI18n, t } from "./i18n";
import { handleVaultDelete, handleVaultRename } from "./share-index";
import { TemplatePreviewManager } from "./template-preview/manager";

export default class HtmltoLinkPlugin extends Plugin {
	settings!: HtmltoLinkSettings;
	private templatePreviewManager?: TemplatePreviewManager;

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

		this.templatePreviewManager = new TemplatePreviewManager(this);
		this.app.workspace.onLayoutReady(() => {
			this.templatePreviewManager?.sync();
		});
		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				this.templatePreviewManager?.sync();
			}),
		);
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				this.templatePreviewManager?.sync();
				window.setTimeout(() => this.templatePreviewManager?.sync(), 0);
			}),
		);
		this.registerEvent(
			this.app.workspace.on("editor-change", (_editor, info) => {
				if (info instanceof MarkdownView) {
					this.templatePreviewManager?.onEditorChange(info);
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (file instanceof TFile) this.templatePreviewManager?.onFileChange(file);
			}),
		);

		this.addCommand({
			id: "focus-template-preview-controls",
			name: t("commandFocusTemplatePreview"),
			checkCallback: (checking: boolean) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) return false;
				if (!checking) {
					this.templatePreviewManager?.sync();
					this.templatePreviewManager?.focusActive();
				}
				return true;
			},
		});

		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				void handleVaultRename(this, file, oldPath);
			}),
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				void handleVaultDelete(this, file);
			}),
		);
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (!(file instanceof TFile) || file.extension !== "md") return;
				menu.addItem((item) => {
					item
						.setTitle(t("menuPublish"))
						.setIcon("share")
						.onClick(() => {
							void publishNote(this, file);
						});
				});
				if (this.settings.noteShares?.[file.path]) {
					menu.addItem((item) => {
						item
							.setTitle(t("menuDeleteShare"))
							.setIcon("trash")
							.onClick(() => {
								void deleteShareNote(this, file);
							});
					});
				}
			}),
		);

		// plugin loaded
	}

	/** 切换语言后重新应用 i18n（设置页会立即刷新；命令名需重载插件） */
	applyLanguage(): void {
		initI18n(this.app, this.settings.language ?? "auto");
	}

	onunload() {
		this.templatePreviewManager?.destroy();
		this.templatePreviewManager = undefined;
	}

	async loadSettings() {
		const data = (await this.loadData()) as Partial<HtmltoLinkSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
		// 确保 uploadedAssets 始终是对象（旧版本可能没有该字段）
		if (!this.settings.uploadedAssets || typeof this.settings.uploadedAssets !== "object") {
			this.settings.uploadedAssets = {};
		}
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
