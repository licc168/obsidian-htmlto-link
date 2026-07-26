import { requestUrl, type App, type TFile } from "obsidian";
import type { HtmltoLinkSettings } from "./constants";
import { t } from "./i18n";

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
	skipped: number;
	failed: string[];
}

interface ImageRef {
	/** full matched markdown snippet */
	raw: string;
	/** path/link target used for vault resolve */
	target: string;
	/** alt text if any */
	alt: string;
	kind: "wiki" | "md";
}

function isRemoteOrDataUrl(src: string): boolean {
	const value = src.trim();
	return (
		/^(https?:|data:|blob:|file:|\/\/)/i.test(value) ||
		value.startsWith("#")
	);
}

function extOf(path: string): string {
	const base = path.split(/[/\\]/).pop() || path;
	const idx = base.lastIndexOf(".");
	if (idx < 0) return "";
	return base.slice(idx + 1).toLowerCase();
}

function contentTypeForFile(file: TFile): string {
	const byExt = EXT_CONTENT_TYPE[extOf(file.path)] || EXT_CONTENT_TYPE[extOf(file.name)];
	if (byExt) return byExt;
	// Obsidian extension field is without dot
	const ext = (file.extension || "").toLowerCase();
	return EXT_CONTENT_TYPE[ext] || "application/octet-stream";
}

function collectImageRefs(markdown: string): ImageRef[] {
	const refs: ImageRef[] = [];

	// ![[path|size]] or ![[path]]
	const wikiRe = /!\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
	let match: RegExpExecArray | null;
	while ((match = wikiRe.exec(markdown)) !== null) {
		const target = match[1].trim();
		if (!target || isRemoteOrDataUrl(target)) continue;
		refs.push({
			raw: match[0],
			target,
			alt: (match[2] || "").trim(),
			kind: "wiki",
		});
	}

	// ![alt](path "title") — skip remote
	const mdRe = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
	while ((match = mdRe.exec(markdown)) !== null) {
		const target = match[2].trim();
		if (!target || isRemoteOrDataUrl(target)) continue;
		refs.push({
			raw: match[0],
			target,
			alt: (match[1] || "").trim(),
			kind: "md",
		});
	}

	return refs;
}

function resolveLocalImage(app: App, sourcePath: string, target: string): TFile | null {
	const dest = app.metadataCache.getFirstLinkpathDest(target, sourcePath);
	if (dest) return dest;

	// Fallback: direct path lookup
	const normalized = target.replace(/^\.\//, "");
	const abstract = app.vault.getAbstractFileByPath(normalized);
	if (abstract && "extension" in abstract) {
		return abstract as TFile;
	}
	return null;
}

function isImageFile(file: TFile): boolean {
	const ext = (file.extension || extOf(file.path)).toLowerCase();
	return Boolean(EXT_CONTENT_TYPE[ext]);
}

async function uploadAsset(
	settings: HtmltoLinkSettings,
	file: TFile,
	data: ArrayBuffer,
): Promise<string> {
	const base = settings.apiBaseUrl.replace(/\/+$/, "");
	const apiToken = settings.apiToken.trim();
	const contentType = contentTypeForFile(file);
	const headers: Record<string, string> = {
		Accept: "application/json",
		"Content-Type": contentType,
		"X-Filename": file.name,
	};
	if (apiToken) {
		headers.Authorization = `Bearer ${apiToken}`;
	}

	let res;
	try {
		res = await requestUrl({
			url: `${base}/api/assets`,
			method: "POST",
			headers,
			body: data,
			throw: false,
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(t("networkFailed") + message);
	}

	let dataJson: { success?: boolean; url?: string; error?: string } = {};
	try {
		dataJson =
			typeof res.json === "object" && res.json !== null
				? (res.json as { success?: boolean; url?: string; error?: string })
				: (JSON.parse(res.text || "{}") as {
						success?: boolean;
						url?: string;
						error?: string;
					});
	} catch {
		throw new Error(t("invalidJson") + res.status + ")");
	}

	if (res.status >= 400 || !dataJson.success || !dataJson.url) {
		throw new Error(dataJson.error || t("httpFailed") + res.status + ")");
	}

	return dataJson.url;
}

function escapeMdAlt(alt: string): string {
	return alt.replace(/[[\]]/g, "");
}

/**
 * Resolve local images in markdown, upload to htmlto.link OSS, rewrite to public URLs.
 * Does not modify the vault note — only the markdown sent to share API.
 */
export async function rewriteLocalImagesForShare(
	app: App,
	settings: HtmltoLinkSettings,
	sourceFile: TFile,
	markdown: string,
	onProgress?: (done: number, total: number) => void,
): Promise<LocalImageRewriteResult> {
	const refs = collectImageRefs(markdown);
	if (refs.length === 0) {
		return { markdown, uploaded: 0, skipped: 0, failed: [] };
	}

	const urlByPath = new Map<string, string>();
	const failed: string[] = [];
	let uploaded = 0;
	let skipped = 0;

	// Unique targets in document order
	const uniqueTargets: string[] = [];
	const seen = new Set<string>();
	for (const ref of refs) {
		const key = ref.target;
		if (seen.has(key)) continue;
		seen.add(key);
		uniqueTargets.push(key);
	}

	let done = 0;
	for (const target of uniqueTargets) {
		const file = resolveLocalImage(app, sourceFile.path, target);
		if (!file || !isImageFile(file)) {
			skipped += 1;
			done += 1;
			onProgress?.(done, uniqueTargets.length);
			continue;
		}

		try {
			const binary = await app.vault.readBinary(file);
			if (!binary.byteLength) {
				skipped += 1;
			} else if (binary.byteLength > MAX_ASSET_BYTES) {
				failed.push(`${file.name} (>5MB)`);
			} else {
				const url = await uploadAsset(settings, file, binary);
				urlByPath.set(target, url);
				// also key by path for alternate refs
				urlByPath.set(file.path, url);
				urlByPath.set(file.name, url);
				uploaded += 1;
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			failed.push(`${file.name}: ${message}`);
		}

		done += 1;
		onProgress?.(done, uniqueTargets.length);
	}

	if (urlByPath.size === 0) {
		return { markdown, uploaded, skipped, failed };
	}

	let next = markdown;

	// Replace longer raw strings first to reduce partial collisions
	const sortedRefs = [...refs].sort((a, b) => b.raw.length - a.raw.length);
	for (const ref of sortedRefs) {
		const url =
			urlByPath.get(ref.target) ||
			urlByPath.get(ref.target.replace(/^\.\//, ""));
		if (!url) continue;

		const alt =
			ref.kind === "wiki"
				? escapeMdAlt(ref.alt && !/^\d+$/.test(ref.alt) ? ref.alt : "")
				: escapeMdAlt(ref.alt);
		const replacement = `![${alt}](${url})`;
		next = next.split(ref.raw).join(replacement);
	}

	return { markdown: next, uploaded, skipped, failed };
}
