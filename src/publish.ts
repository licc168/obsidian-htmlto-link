import { MarkdownView, Modal, Notice, TFile } from "obsidian";
import type HtmltoLinkPlugin from "./main";
import { createSharePage, deleteSharePage } from "./api";
import {
	type NoteShareRecord,
	resolveThemeClassForTemplate,
} from "./constants";
import {
	openPublishFlow,
	openPublishSuccess,
	type PublishOptions,
	type PublishSuccessInfo,
} from "./publish-modal";
import { t, timeLocale } from "./i18n";
import { rewriteLocalImagesForShare } from "./local-images";

/**
 * 去掉 YAML frontmatter，避免把元数据渲染进分享页
 */
export function stripFrontmatter(markdown: string): string {
	if (!markdown.startsWith("---")) return markdown;
	const match = markdown.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
	if (!match) return markdown;
	return markdown.slice(match[0].length);
}

/**
 * 简单处理 Obsidian wiki 链接：
 * [[Note]] -> Note
 * [[Note|显示名]] -> 显示名
 * ![[image.png]] 保留原样（由 rewriteLocalImagesForShare 上传后改写）
 */
export function normalizeWikiLinks(markdown: string): string {
	return markdown.replace(
		/(!)?\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g,
		(full, bang, target, alias) => {
			if (bang) return full;
			return alias?.trim() || target.trim();
		},
	);
}

export function prepareMarkdown(raw: string): string {
	const withoutFm = stripFrontmatter(raw);
	return normalizeWikiLinks(withoutFm).trim();
}

function getNoteShare(
	plugin: HtmltoLinkPlugin,
	file: TFile,
): NoteShareRecord | undefined {
	return plugin.settings.noteShares?.[file.path];
}

async function saveNoteShare(
	plugin: HtmltoLinkPlugin,
	file: TFile,
	record: NoteShareRecord,
): Promise<void> {
	if (!plugin.settings.noteShares) {
		plugin.settings.noteShares = {};
	}
	plugin.settings.noteShares[file.path] = record;
	await plugin.saveSettings();
}

async function doPublish(
	plugin: HtmltoLinkPlugin,
	file: TFile,
	markdown: string,
	options: PublishOptions,
): Promise<PublishSuccessInfo> {
	const themeClass = resolveThemeClassForTemplate(
		options.templateId,
		options.themeClass,
	);

	// 记住本次选择，下次默认选中
	plugin.settings.templateId = options.templateId;
	plugin.settings.themeClass = themeClass;
	await plugin.saveSettings();

	// 本地图 → OSS 公开 URL（只改分享内容，不改 vault 原笔记）
	const imageResult = await rewriteLocalImagesForShare(
		plugin.app,
		plugin.settings,
		file,
		markdown,
	);
	if (imageResult.cacheUpdated) {
		await plugin.saveSettings();
	}
	const content = imageResult.markdown;
	if (imageResult.failed.length > 0) {
		new Notice(
			t("imageUploadPartialFail", {
				count: String(imageResult.failed.length),
			}),
			6000,
		);
	}

	const existing = getNoteShare(plugin, file);
	const result = await createSharePage(plugin.settings, {
		content,
		title: file.basename,
		templateId: options.templateId,
		themeClass,
		slug: existing?.slug,
		updateToken: existing?.updateToken,
	});

	const url = result.url!;
	const slug = result.slug || existing?.slug;
	const updateToken = result.updateToken || existing?.updateToken;
	const updated = Boolean(result.updated);

	// 有效期提示：游客 24h；登录用户按套餐有效期
	let guestNote: string | undefined;
	if (result.expiresAt) {
		const expire = new Date(result.expiresAt);
		const expireText = expire.toLocaleString(timeLocale(), {
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
		guestNote = result.temporary
			? t("guestNoteExpiryGuest", { time: expireText })
			: t("guestNoteExpiryUser", { time: expireText });
	} else if (result.temporary) {
		guestNote = t("guestNoteGuestSimple");
	}

	if (slug && updateToken) {
		await saveNoteShare(plugin, file, {
			slug,
			updateToken,
			url,
			updatedAt: new Date().toISOString(),
		});
	}

	let autoCopied = false;
	if (plugin.settings.copyLinkOnSuccess) {
		try {
			await navigator.clipboard.writeText(url);
			autoCopied = true;
		} catch {
			autoCopied = false;
		}
	}

	if (plugin.settings.writeShareToNote) {
		await writeShareToFrontmatter(plugin, file, url);
	}

	if (plugin.settings.openInBrowser) {
		window.open(url, "_blank");
	}

	return {
		url,
		updated,
		noteTitle: file.basename,
		autoCopied,
		guestNote,
	};
}

export async function publishActiveNote(plugin: HtmltoLinkPlugin): Promise<void> {
	const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) {
		new Notice(t("errNoView"));
		return;
	}

	const file = view.file;
	if (!file) {
		new Notice(t("errNoFile"));
		return;
	}

	// 优先读磁盘最新内容，避免未保存编辑丢失
	const raw = await plugin.app.vault.read(file);
	const markdown = prepareMarkdown(raw);

	if (!markdown) {
		new Notice(t("errEmpty"));
		return;
	}

	const initial: PublishOptions = {
		templateId: plugin.settings.templateId,
		themeClass: resolveThemeClassForTemplate(
			plugin.settings.templateId,
			plugin.settings.themeClass,
		),
	};

	// 开启「发布时选择」：同一弹窗完成 选模板 → 发布中 → 成功/复制
	if (plugin.settings.showOptionsOnPublish) {
		const guestWarning = plugin.settings.apiToken.trim()
			? undefined
			: t("guestWarning");
		openPublishFlow(
			plugin.app,
			initial,
			file.basename,
			(options) => doPublish(plugin, file, markdown, options),
			guestWarning,
		);
		return;
	}

	// 关闭选择弹窗：直接发布，成功后弹出结果框
	const notice = new Notice(t("publishingNotice"), 0);
	try {
		const info = await doPublish(plugin, file, markdown, initial);
		notice.hide();
		openPublishSuccess(plugin.app, info);
	} catch (err: unknown) {
		notice.hide();
		const message = err instanceof Error ? err.message : String(err);
		new Notice(t("publishFailed") + message, 10000);
		// publish failed silently
	}
}

/**
 * 将分享链接和更新时间写入笔记 frontmatter（属性面板）。
 * 写入字段：share_link / share_updated
 */
async function writeShareToFrontmatter(
	plugin: HtmltoLinkPlugin,
	file: TFile,
	url: string,
): Promise<void> {
	// 生成带时区偏移的 ISO 8601 时间戳，如 2026-07-22T10:01:11+08:00
	const now = new Date();
	const offset = -now.getTimezoneOffset();
	const sign = offset >= 0 ? "+" : "-";
	const pad = (n: number) => String(Math.abs(n)).padStart(2, "0");
	const tz = `${sign}${pad(Math.floor(offset / 60))}:${pad(offset % 60)}`;
	const iso = now.toISOString().replace("Z", tz);

	await plugin.app.fileManager.processFrontMatter(file, (fm) => {
		fm["share_link"] = url;
		fm["share_updated"] = iso;
	});
}

/**
 * 从笔记 frontmatter 中移除分享相关字段。
 */
async function removeShareFromFrontmatter(
	plugin: HtmltoLinkPlugin,
	file: TFile,
): Promise<void> {
	await plugin.app.fileManager.processFrontMatter(file, (fm) => {
		delete fm["share_link"];
		delete fm["share_updated"];
	});
}

/**
 * 删除当前笔记的分享。
 * 1. 确认弹窗
 * 2. 调用 API 删除服务端分享
 * 3. 清除本地 noteShares 记录
 * 4. 清除 frontmatter 中的 share_link / share_updated
 */
export async function deleteShareActiveNote(
	plugin: HtmltoLinkPlugin,
): Promise<void> {
	const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) {
		new Notice(t("errNoView"));
		return;
	}

	const file = view.file;
	if (!file) {
		new Notice(t("errNoFile"));
		return;
	}

	const record = getNoteShare(plugin, file);
	if (!record) {
		new Notice(t("noShareToDelete"));
		return;
	}

	// 确认弹窗
	const noteName = file.basename;
	const confirmed = await new Promise<boolean>((resolve) => {
		let resolved = false;
		class ConfirmModal extends Modal {
			onOpen() {
				this.titleEl.setText(t("deleteConfirmTitle"));
				this.contentEl.createEl("p", {
					text: t("deleteConfirmMsg", { note: noteName }),
				});
				const btnRow = this.contentEl.createDiv({ cls: "modal-button-container" });
				const cancelBtn = btnRow.createEl("button", { text: t("deleteConfirmNo") });
				cancelBtn.addEventListener("click", () => {
					resolved = true;
					resolve(false);
					this.close();
				});
				const deleteBtn = btnRow.createEl("button", {
					text: t("deleteConfirmYes"),
					cls: "mod-warning",
				});
				deleteBtn.addEventListener("click", () => {
					resolved = true;
					resolve(true);
					this.close();
				});
			}
			onClose() {
				if (!resolved) resolve(false);
			}
		}
		new ConfirmModal(plugin.app).open();
	});

	if (!confirmed) return;

	const notice = new Notice(t("deletingNotice"), 0);
	try {
		await deleteSharePage(plugin.settings, record.slug, record.updateToken);

		// 清除本地记录
		delete plugin.settings.noteShares[file.path];
		await plugin.saveSettings();

		// 清除 frontmatter
		await removeShareFromFrontmatter(plugin, file);

		notice.hide();
		new Notice(t("deleteSuccess"), 5000);
	} catch (err: unknown) {
		notice.hide();
		const message = err instanceof Error ? err.message : String(err);
		new Notice(t("deleteFailed") + message, 10000);
	}
}
