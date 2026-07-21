import { MarkdownView, Notice, TFile } from "obsidian";
import type HtmltoLinkPlugin from "./main";
import { createSharePage } from "./api";
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
 * ![[image.png]] 保留原样（本地图暂不上传）
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
	plugin.settings.cardWidth = options.cardWidth;
	plugin.settings.themeClass = themeClass;
	await plugin.saveSettings();

	const existing = getNoteShare(plugin, file);
	const result = await createSharePage(plugin.settings, {
		content: markdown,
		title: file.basename,
		templateId: options.templateId,
		themeClass,
		cardWidth: options.cardWidth,
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
		const expireText = expire.toLocaleString("zh-CN", {
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
		guestNote = result.temporary
			? `游客发布：链接将在 ${expireText} 过期（保留 24 小时）。填写 API Token 可归属你的账号并延长有效期。`
			: `链接将在 ${expireText} 过期（已绑定你的账号）。`;
	} else if (result.temporary) {
		guestNote = "游客发布：链接仅保留 24 小时。填写 API Token 可延长有效期。";
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

	if (plugin.settings.appendLinkToNote) {
		await appendShareLink(plugin, file, url);
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
		new Notice("请先打开一篇 Markdown 笔记");
		return;
	}

	const file = view.file;
	if (!file) {
		new Notice("当前没有可发布的笔记文件");
		return;
	}

	// 优先读磁盘最新内容，避免未保存编辑丢失
	const raw = await plugin.app.vault.read(file);
	const markdown = prepareMarkdown(raw);

	if (!markdown) {
		new Notice("笔记内容为空，无法发布");
		return;
	}

	const initial: PublishOptions = {
		templateId: plugin.settings.templateId,
		cardWidth: plugin.settings.cardWidth,
		themeClass: resolveThemeClassForTemplate(
			plugin.settings.templateId,
			plugin.settings.themeClass,
		),
	};

	// 开启「发布时选择」：同一弹窗完成 选模板 → 发布中 → 成功/复制
	if (plugin.settings.showOptionsOnPublish) {
		const guestWarning = plugin.settings.apiToken.trim()
			? undefined
			: "未填写 API Token，本次为游客发布：分享链接仅保留 24 小时。可在插件设置中填写 Token 延长有效期。";
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
	const notice = new Notice("正在发布到 htmlto.link…", 0);
	try {
		const info = await doPublish(plugin, file, markdown, initial);
		notice.hide();
		openPublishSuccess(plugin.app, info);
	} catch (err) {
		notice.hide();
		const message = err instanceof Error ? err.message : String(err);
		new Notice(`发布失败：${message}`, 10000);
		console.error("[htmlto-link] publish failed", err);
	}
}

async function appendShareLink(
	plugin: HtmltoLinkPlugin,
	file: TFile,
	url: string,
): Promise<void> {
	const stamp = new Date().toISOString().slice(0, 19).replace("T", " ");
	const block = `\n\n---\n\n> 分享链接（${stamp}）：[${url}](${url})\n`;
	await plugin.app.vault.process(file, (data) => {
		if (data.includes(url)) return data;
		return data + block;
	});
}
