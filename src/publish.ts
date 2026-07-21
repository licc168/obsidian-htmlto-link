import { MarkdownView, Notice, TFile } from "obsidian";
import type HtmltoLinkPlugin from "./main";
import { createSharePage } from "./api";

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
	// 图片 wiki 链接先不动
	// 普通 wiki 链接转成可读文本
	return markdown.replace(/(!)?\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (full, bang, target, alias) => {
		if (bang) return full; // 嵌入图片/笔记
		return alias?.trim() || target.trim();
	});
}

export function prepareMarkdown(raw: string): string {
	const withoutFm = stripFrontmatter(raw);
	return normalizeWikiLinks(withoutFm).trim();
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

	const notice = new Notice("正在发布到 htmlto.link…", 0);

	try {
		const result = await createSharePage(plugin.settings, {
			markdown,
			templateId: plugin.settings.templateId,
			themeClass: plugin.settings.themeClass,
			cardWidth: plugin.settings.cardWidth,
		});

		const url = result.url!;
		notice.hide();

		if (plugin.settings.copyLinkOnSuccess) {
			await navigator.clipboard.writeText(url);
			new Notice(`已发布并复制链接\n${url}`, 8000);
		} else {
			new Notice(`已发布\n${url}`, 8000);
		}

		if (plugin.settings.appendLinkToNote) {
			await appendShareLink(plugin, file, url);
		}

		if (plugin.settings.openInBrowser) {
			window.open(url, "_blank");
		}
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
