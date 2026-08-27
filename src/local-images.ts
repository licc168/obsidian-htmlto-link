import { requestUrl, TFile, type App, type RequestUrlResponse } from "obsidian";
import type { HtmltoLinkSettings, UploadedAssetRecord } from "./constants";
import { t } from "./i18n";
import { optionalBoolean, optionalString, parseJsonObject } from "./json";

const MAX_ASSET_BYTES = 20 * 1024 * 1024;

const EXT_CONTENT_TYPE: Record<string, string> = {
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	gif: "image/gif",
	webp: "image/webp",
	svg: "image/svg+xml",
	avif: "image/avif",
	bmp: "image/bmp",
	ico: "image/x-icon",
};

export interface LocalImageRewriteResult {
	markdown: string;
	uploaded: number;
	cached: number;
	skipped: number;
	failed: string[];
	cacheUpdated: boolean;
}

interface ImageRef {
	raw: string;
	target: string;
	alt: string;
	kind: "wiki" | "md";
}

function isRemoteOrDataUrl(src: string): boolean {
	const value = src.trim();
	return /^(https?:|data:|blob:|file:|\/\/)/i.test(value) || value.startsWith("#");
}

function extOf(path: string): string {
	const base = path.split(/[/\\]/).pop() || path;
	const idx = base.lastIndexOf(".");
	return idx < 0 ? "" : base.slice(idx + 1).toLowerCase();
}

function contentTypeForFile(file: TFile): string {
	const byExt = EXT_CONTENT_TYPE[extOf(file.path)] || EXT_CONTENT_TYPE[extOf(file.name)];
	return byExt || EXT_CONTENT_TYPE[(file.extension || "").toLowerCase()] || "application/octet-stream";
}

function collectImageRefs(markdown: string): ImageRef[] {
	const refs: ImageRef[] = [];
	const wikiRe = /!\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
	let match: RegExpExecArray | null;
	while ((match = wikiRe.exec(markdown)) !== null) {
		const target = match[1].trim();
		if (target && !isRemoteOrDataUrl(target)) {
			refs.push({ raw: match[0], target, alt: (match[2] || "").trim(), kind: "wiki" });
		}
	}

	const mdRe = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
	while ((match = mdRe.exec(markdown)) !== null) {
		const target = match[2].trim();
		if (target && !isRemoteOrDataUrl(target)) {
			refs.push({ raw: match[0], target, alt: (match[1] || "").trim(), kind: "md" });
		}
	}
	return refs;
}

function resolveLocalImage(app: App, sourcePath: string, target: string): TFile | null {
	const dest = app.metadataCache.getFirstLinkpathDest(target, sourcePath);
	if (dest) return dest;
	const abstract = app.vault.getAbstractFileByPath(target.replace(/^\.\//, ""));
	return abstract instanceof TFile ? abstract : null;
}

function isImageFile(file: TFile): boolean {
	return Boolean(EXT_CONTENT_TYPE[(file.extension || extOf(file.path)).toLowerCase()]);
}

function getCachedUrl(record: UploadedAssetRecord | undefined, file: TFile): string | null {
	if (!record || record.mtime !== file.stat.mtime || record.size !== file.stat.size) return null;
	if (record.temporary) {
		if (!record.expiresAt || Date.parse(record.expiresAt) <= Date.now()) return null;
	}
	return record.url;
}

async function uploadAsset(
	settings: HtmltoLinkSettings,
	file: TFile,
	data: ArrayBuffer,
): Promise<{ url: string; temporary: boolean; expiresAt?: string }> {
	const base = settings.apiBaseUrl.replace(/\/+$/, "");
	const apiToken = settings.apiToken.trim();
	const headers: Record<string, string> = {
		Accept: "application/json",
		"Content-Type": contentTypeForFile(file),
		"X-Filename": file.name,
	};
	if (apiToken) headers.Authorization = `Bearer ${apiToken}`;

	let res: RequestUrlResponse;
	try {
		res = await requestUrl({
			url: `${base}/api/assets`,
			method: "POST",
			headers,
			body: data,
			throw: false,
		});
	} catch (err: unknown) {
		throw new Error(t("networkFailed") + (err instanceof Error ? err.message : String(err)));
	}

	let response: Record<string, unknown>;
	try {
		response = parseJsonObject(res.text);
	} catch {
		throw new Error(t("invalidJson") + res.status + ")");
	}
	const success = optionalBoolean(response, "success");
	const url = optionalString(response, "url");
	if (res.status >= 400 || !success || !url) {
		throw new Error(
			optionalString(response, "error") || t("httpFailed") + res.status + ")",
		);
	}
	return {
		url,
		temporary: optionalBoolean(response, "temporary") ?? !apiToken,
		expiresAt: optionalString(response, "expiresAt"),
	};
}

function escapeMdAlt(alt: string): string {
	return alt.replace(/[[\]]/g, "");
}

export async function rewriteLocalImagesForShare(
	app: App,
	settings: HtmltoLinkSettings,
	sourceFile: TFile,
	markdown: string,
	onProgress?: (done: number, total: number) => void,
): Promise<LocalImageRewriteResult> {
	const refs = collectImageRefs(markdown);
	if (refs.length === 0) {
		return { markdown, uploaded: 0, cached: 0, skipped: 0, failed: [], cacheUpdated: false };
	}

	const urlByPath = new Map<string, string>();
	const uniqueTargets = [...new Set(refs.map((ref) => ref.target))];
	let done = 0;
	const results = await Promise.all(
		uniqueTargets.map(async (target) => {
			const file = resolveLocalImage(app, sourceFile.path, target);
			if (!file || !isImageFile(file)) return { target, skipped: true } as const;
			const cachedUrl = getCachedUrl(settings.uploadedAssets[file.path], file);
			if (cachedUrl) return { target, file, url: cachedUrl, cached: true } as const;
			try {
				const binary = await app.vault.readBinary(file);
				if (!binary.byteLength) return { target, skipped: true } as const;
				if (binary.byteLength > MAX_ASSET_BYTES) {
					return { target, failed: `${file.name} (>20MB)` } as const;
				}
				const uploaded = await uploadAsset(settings, file, binary);
				return { target, file, url: uploaded.url, uploaded } as const;
			} catch (err: unknown) {
				return {
					target,
					failed: `${file.name}: ${err instanceof Error ? err.message : String(err)}`,
				} as const;
			} finally {
				done += 1;
				onProgress?.(done, uniqueTargets.length);
			}
		}),
	);

	let uploaded = 0;
	let cached = 0;
	let skipped = 0;
	let cacheUpdated = false;
	const failed: string[] = [];
	for (const result of results) {
		if ("failed" in result && typeof result.failed === "string") {
			failed.push(result.failed);
			continue;
		}
		if ("skipped" in result) {
			skipped += 1;
			continue;
		}
		urlByPath.set(result.target, result.url);
		urlByPath.set(result.file.path, result.url);
		urlByPath.set(result.file.name, result.url);
		if ("cached" in result) {
			cached += 1;
		} else {
			uploaded += 1;
			cacheUpdated = true;
			settings.uploadedAssets[result.file.path] = {
				url: result.url,
				mtime: result.file.stat.mtime,
				size: result.file.stat.size,
				uploadedAt: new Date().toISOString(),
				temporary: result.uploaded.temporary,
				expiresAt: result.uploaded.expiresAt,
			};
		}
	}

	let next = markdown;
	for (const ref of [...refs].sort((a, b) => b.raw.length - a.raw.length)) {
		const url = urlByPath.get(ref.target) || urlByPath.get(ref.target.replace(/^\.\//, ""));
		if (!url) continue;
		const alt = ref.kind === "wiki"
			? escapeMdAlt(ref.alt && !/^\d+$/.test(ref.alt) ? ref.alt : "")
			: escapeMdAlt(ref.alt);
		next = next.split(ref.raw).join(`![${alt}](${url})`);
	}
	return { markdown: next, uploaded, cached, skipped, failed, cacheUpdated };
}
