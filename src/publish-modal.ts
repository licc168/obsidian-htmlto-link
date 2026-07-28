import { App, Modal, Notice, Setting } from "obsidian";
import {
	TEMPLATE_OPTIONS,
	getTemplateThemes,
	hasMultiThemes,
	resolveThemeClassForTemplate,
} from "./constants";
import { t } from "./i18n";

export interface PublishOptions {
	templateId: string;
	themeClass: string;
}

export interface PublishSuccessInfo {
	url: string;
	/** true = 更新已有链接；false = 新建 */
	updated: boolean;
	noteTitle: string;
	/** 打开弹窗时是否已自动复制 */
	autoCopied?: boolean;
	/** 有效期提示（游客 24h / 登录用户套餐有效期） */
	guestNote?: string;
}

/**
 * 发布弹窗：选模板/主题 → 发布中 → 成功展示链接 + 复制
 * 全程同一弹窗，避免 close 竞态导致“点了没反应”
 */
export class PublishFlowModal extends Modal {
	private draft: PublishOptions;
	private noteTitle: string;
	private onPublish: (options: PublishOptions) => Promise<PublishSuccessInfo>;
	private phase: "options" | "publishing" | "success" | "error" = "options";
	private result: PublishSuccessInfo | null = null;
	private errorMessage = "";
	private guestWarning?: string;

	constructor(
		app: App,
		initial: PublishOptions,
		noteTitle: string,
		onPublish: (options: PublishOptions) => Promise<PublishSuccessInfo>,
		guestWarning?: string,
	) {
		super(app);
		this.draft = {
			...initial,
			themeClass: resolveThemeClassForTemplate(
				initial.templateId,
				initial.themeClass,
			),
		};
		this.noteTitle = noteTitle;
		this.onPublish = onPublish;
		this.guestWarning = guestWarning;
	}

	onOpen() {
		this.render();
	}

	onClose() {
		this.contentEl.empty();
	}

	private render() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("htmlto-link-publish-modal");

		if (this.phase === "success" && this.result) {
			renderSuccessContent(contentEl, this.result, () => this.close());
			return;
		}

		contentEl.createEl("h2", { text: t("publishTitle") });
		contentEl.createEl("p", {
			text: t("notePrefix") + this.noteTitle,
			cls: "setting-item-description",
		});

		if (this.guestWarning) {
			contentEl.createEl("p", {
				text: this.guestWarning,
				cls: "htmlto-link-publish-guest-note",
			});
		}

		const optionsDisabled = this.phase === "publishing";
		const multiTheme = hasMultiThemes(this.draft.templateId);
		const themes = getTemplateThemes(this.draft.templateId);

		const templateSetting = new Setting(contentEl)
			.setName(t("templateName"));

		const descFragment = createFragment((frag) => {
			frag.appendText(t("templateDesc") + " ");
			const previewLink = frag.createEl("a", {
				text: "🔍 " + t("previewTemplateLink"),
				href: "https://htmlto.link/editor",
				cls: "htmlto-link-template-preview-link",
			});
			previewLink.target = "_blank";
			previewLink.rel = "noopener noreferrer";
		});

		templateSetting.setDesc(descFragment);

		templateSetting.addDropdown((dropdown) => {
			for (const item of TEMPLATE_OPTIONS) {
				// id 传给 API；显示名走 i18n
				dropdown.addOption(item.id, t(item.nameKey));
			}
			dropdown.setValue(this.draft.templateId).onChange((value) => {
				this.draft.templateId = value;
				// 切换模板时同步主题（有多主题用默认/兼容值，无则清空）
				this.draft.themeClass = resolveThemeClassForTemplate(
					value,
					this.draft.themeClass,
				);
				// 主题选项依赖模板，需要重绘
				if (this.phase === "options" || this.phase === "error") {
					this.render();
				}
			});
			dropdown.setDisabled(optionsDisabled);
		});

		if (multiTheme) {
			new Setting(contentEl)
				.setName(t("themeName"))
				.setDesc(t("themeDesc"))
				.addDropdown((dropdown) => {
					for (const item of themes) {
						// value 传给 API；显示名走 i18n
						dropdown.addOption(item.value, t(item.labelKey));
					}
					const current = resolveThemeClassForTemplate(
						this.draft.templateId,
						this.draft.themeClass,
					);
					this.draft.themeClass = current;
					dropdown.setValue(current).onChange((value) => {
						this.draft.themeClass = value;
					});
					dropdown.setDisabled(optionsDisabled);
				});
		} else {
			// 无多主题：隐藏主题选择，发布时传空（服务端用模板固定样式）
			this.draft.themeClass = "";
		}

		const statusEl = contentEl.createEl("p", {
			cls: "htmlto-link-publish-status setting-item-description",
		});
		if (this.phase === "publishing") {
			statusEl.setText(t("publishing"));
		} else if (this.phase === "error") {
			statusEl.setText(t("publishFailedPrefix") + this.errorMessage);
			statusEl.addClass("htmlto-link-publish-error");
		}

		const actions = contentEl.createDiv({
			cls: "htmlto-link-publish-actions",
		});

		const cancelBtn = actions.createEl("button", {
			text: t("cancel"),
		});
		cancelBtn.disabled = this.phase === "publishing";
		cancelBtn.addEventListener("click", () => this.close());

		const publishBtn = actions.createEl("button", {
			text: this.phase === "publishing" ? t("publishingBtn") : t("publishBtn"),
			cls: "mod-cta",
		});
		publishBtn.disabled = this.phase === "publishing";
		publishBtn.addEventListener("click", () => {
			void this.handlePublish();
		});
	}

	private async handlePublish() {
		if (this.phase === "publishing") return;

		this.phase = "publishing";
		this.errorMessage = "";
		// 发布前再校正一次主题
		this.draft.themeClass = resolveThemeClassForTemplate(
			this.draft.templateId,
			this.draft.themeClass,
		);
		this.render();

		try {
			const result = await this.onPublish({ ...this.draft });
			this.result = result;
			this.phase = "success";
			this.render();
		} catch (err: unknown) {
			this.phase = "error";
			this.errorMessage =
				err instanceof Error ? err.message : String(err);
			this.render();
			// publish failed silently
		}
	}
}

/** 仅展示成功结果的弹窗（关闭「发布时选择」时用） */
export class PublishSuccessModal extends Modal {
	private info: PublishSuccessInfo;

	constructor(app: App, info: PublishSuccessInfo) {
		super(app);
		this.info = info;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("htmlto-link-publish-modal");
		renderSuccessContent(contentEl, this.info, () => this.close());
	}

	onClose() {
		this.contentEl.empty();
	}
}

function renderSuccessContent(
	contentEl: HTMLElement,
	info: PublishSuccessInfo,
	onClose: () => void,
) {
	const title = info.updated ? t("updatedTitle") : t("successTitle");
	contentEl.createEl("h2", { text: title });
	contentEl.createEl("p", {
		text: t("notePrefix") + info.noteTitle,
		cls: "setting-item-description",
	});

	if (info.guestNote) {
		contentEl.createEl("p", {
			text: info.guestNote,
			cls: "htmlto-link-publish-guest-note",
		});
	}

	contentEl.createEl("div", {
		text: t("shareLinkLabel"),
		cls: "htmlto-link-success-label",
	});

	const urlRow = contentEl.createDiv({
		cls: "htmlto-link-success-url-row",
	});
	const urlInput = urlRow.createEl("input", {
		cls: "htmlto-link-success-url",
	}) as HTMLInputElement;
	urlInput.type = "text";
	urlInput.readOnly = true;
	urlInput.value = info.url;
	urlInput.addEventListener("focus", () => urlInput.select());
	urlInput.addEventListener("click", () => urlInput.select());

	const statusEl = contentEl.createEl("p", {
		cls: "htmlto-link-success-status setting-item-description",
	});
	if (info.autoCopied) {
		statusEl.setText(t("autoCopied"));
	} else {
		statusEl.setText(t("clickToCopy"));
	}

	const actions = contentEl.createDiv({
		cls: "htmlto-link-publish-actions",
	});

	const openBtn = actions.createEl("button", { text: t("openLink") });
	openBtn.addEventListener("click", () => {
		window.open(info.url, "_blank");
	});

	const copyBtn = actions.createEl("button", {
		text: info.autoCopied ? t("copied") : t("copyLink"),
		cls: "mod-cta",
	});

	const setCopied = () => {
		copyBtn.setText(t("copied"));
		statusEl.setText(t("autoCopied"));
		window.setTimeout(() => {
			if (copyBtn.isConnected) {
				copyBtn.setText(t("copyLink"));
			}
		}, 2000);
	};

	copyBtn.addEventListener("click", () => {
		navigator.clipboard
			.writeText(info.url)
			.then(() => {
				setCopied();
				new Notice(t("noticeCopied"));
			})
			.catch(() => {
				urlInput.focus();
				urlInput.select();
				statusEl.setText(t("copyFailed"));
			});
	});

	const closeBtn = actions.createEl("button", { text: t("close") });
	closeBtn.addEventListener("click", () => onClose());
}

/** 打开一体化发布弹窗（选模板 → 发布 → 成功/失败） */
export function openPublishFlow(
	app: App,
	initial: PublishOptions,
	noteTitle: string,
	onPublish: (options: PublishOptions) => Promise<PublishSuccessInfo>,
	guestWarning?: string,
): void {
	new PublishFlowModal(
		app,
		initial,
		noteTitle,
		onPublish,
		guestWarning,
	).open();
}

/** 仅打开成功结果弹窗 */
export function openPublishSuccess(
	app: App,
	info: PublishSuccessInfo,
): void {
	new PublishSuccessModal(app, info).open();
}
