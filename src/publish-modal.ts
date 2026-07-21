import { App, Modal, Notice, Setting } from "obsidian";
import {
	CARD_WIDTH_OPTIONS,
	TEMPLATE_OPTIONS,
	getTemplateThemes,
	hasMultiThemes,
	resolveThemeClassForTemplate,
} from "./constants";

export interface PublishOptions {
	templateId: string;
	cardWidth: number;
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
 * 发布弹窗：选模板/宽度/主题 → 发布中 → 成功展示链接 + 复制
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

		contentEl.createEl("h2", { text: "发布到 htmlto.link" });
		contentEl.createEl("p", {
			text: `笔记：${this.noteTitle}`,
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

		new Setting(contentEl)
			.setName("模板")
			.setDesc("默认选中上次使用的模板，可随时改")
			.addDropdown((dropdown) => {
				for (const item of TEMPLATE_OPTIONS) {
					dropdown.addOption(item.id, item.name);
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
				.setName("主题")
				.setDesc("该模板支持多种主题配色")
				.addDropdown((dropdown) => {
					for (const item of themes) {
						dropdown.addOption(item.value, item.label);
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

		new Setting(contentEl)
			.setName("卡片宽度")
			.setDesc("默认选中上次使用的宽度，可随时改")
			.addDropdown((dropdown) => {
				for (const item of CARD_WIDTH_OPTIONS) {
					dropdown.addOption(String(item.value), item.label);
				}
				const known = CARD_WIDTH_OPTIONS.some(
					(x) => x.value === this.draft.cardWidth,
				);
				if (!known) {
					dropdown.addOption(
						String(this.draft.cardWidth),
						`${this.draft.cardWidth}px（当前）`,
					);
				}
				dropdown
					.setValue(String(this.draft.cardWidth))
					.onChange((value) => {
						this.draft.cardWidth = Number(value) || 440;
					});
				dropdown.setDisabled(optionsDisabled);
			});

		const statusEl = contentEl.createEl("p", {
			cls: "htmlto-link-publish-status setting-item-description",
		});
		if (this.phase === "publishing") {
			statusEl.setText("正在发布，请稍候…");
		} else if (this.phase === "error") {
			statusEl.setText(`发布失败：${this.errorMessage}`);
			statusEl.addClass("htmlto-link-publish-error");
		}

		const actions = contentEl.createDiv({
			cls: "htmlto-link-publish-actions",
		});

		const cancelBtn = actions.createEl("button", {
			text: "取消",
		});
		cancelBtn.disabled = this.phase === "publishing";
		cancelBtn.addEventListener("click", () => this.close());

		const publishBtn = actions.createEl("button", {
			text: this.phase === "publishing" ? "发布中…" : "发布",
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
		} catch (err) {
			this.phase = "error";
			this.errorMessage =
				err instanceof Error ? err.message : String(err);
			this.render();
			console.error("[htmlto-link] publish failed", err);
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
	const title = info.updated ? "已更新分享" : "发布成功";
	contentEl.createEl("h2", { text: title });
	contentEl.createEl("p", {
		text: `笔记：${info.noteTitle}`,
		cls: "setting-item-description",
	});

	if (info.guestNote) {
		contentEl.createEl("p", {
			text: info.guestNote,
			cls: "htmlto-link-publish-guest-note",
		});
	}

	contentEl.createEl("div", {
		text: "分享链接",
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
		statusEl.setText("链接已自动复制到剪贴板");
	} else {
		statusEl.setText("点击下方按钮复制链接");
	}

	const actions = contentEl.createDiv({
		cls: "htmlto-link-publish-actions",
	});

	const openBtn = actions.createEl("button", { text: "打开链接" });
	openBtn.addEventListener("click", () => {
		window.open(info.url, "_blank");
	});

	const copyBtn = actions.createEl("button", {
		text: info.autoCopied ? "已复制" : "复制链接",
		cls: "mod-cta",
	});

	const setCopied = () => {
		copyBtn.setText("已复制");
		statusEl.setText("链接已复制到剪贴板");
		window.setTimeout(() => {
			if (copyBtn.isConnected) {
				copyBtn.setText("复制链接");
			}
		}, 2000);
	};

	copyBtn.addEventListener("click", async () => {
		try {
			await navigator.clipboard.writeText(info.url);
			setCopied();
			new Notice("链接已复制");
		} catch {
			urlInput.focus();
			urlInput.select();
			try {
				const ok = document.execCommand("copy");
				if (ok) {
					setCopied();
					new Notice("链接已复制");
				} else {
					statusEl.setText("复制失败，请手动全选链接后 Ctrl+C");
				}
			} catch {
				statusEl.setText("复制失败，请手动全选链接后 Ctrl+C");
			}
		}
	});

	const closeBtn = actions.createEl("button", { text: "关闭" });
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
