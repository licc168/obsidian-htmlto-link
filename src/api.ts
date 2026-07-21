import { requestUrl } from "obsidian";
import type { HtmltoLinkSettings } from "./constants";

export interface CreateShareRequest {
	/** Markdown 正文（服务端字段名是 content） */
	content: string;
	templateId: string;
	title?: string;
	themeClass?: string;
	cardWidth?: number;
	customCss?: string;
	/** 已有分享的 slug，传入则尝试更新同一 URL */
	slug?: string;
	/** 创建时返回的更新令牌 */
	updateToken?: string;
}

export interface CreateShareResponse {
	success?: boolean;
	ok?: boolean;
	slug?: string;
	url?: string;
	updateToken?: string;
	updated?: boolean;
	/** 是否为游客发布（链接仅保留 24 小时） */
	temporary?: boolean;
	/** 链接过期时间（ISO 字符串） */
	expiresAt?: string;
	error?: string;
}

function buildBody(
	settings: HtmltoLinkSettings,
	payload: CreateShareRequest,
	includeToken = false,
): Record<string, unknown> {
	const body: Record<string, unknown> = {
		content: payload.content,
		templateId: payload.templateId,
		title: payload.title || "分享笔记",
		cardWidth: payload.cardWidth ?? settings.cardWidth,
	};

	if (payload.themeClass || settings.themeClass) {
		body.themeClass = payload.themeClass || settings.themeClass;
	}
	if (payload.customCss) {
		body.customCss = payload.customCss;
	}
	if (includeToken && payload.updateToken) {
		body.updateToken = payload.updateToken;
	}

	return body;
}

async function requestJson(
	url: string,
	method: "POST" | "PUT",
	body: Record<string, unknown>,
	apiToken?: string,
): Promise<{ status: number; data: CreateShareResponse }> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Accept: "application/json",
	};
	if (apiToken) {
		headers["Authorization"] = `Bearer ${apiToken}`;
	}

	let res;
	try {
		res = await requestUrl({
			url,
			method,
			headers,
			body: JSON.stringify(body),
			throw: false,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`网络请求失败：${message}`);
	}

	let data: CreateShareResponse = {};
	try {
		data = (typeof res.json === "object" && res.json !== null
			? res.json
			: JSON.parse(res.text || "{}")) as CreateShareResponse;
	} catch {
		throw new Error(`服务器返回非 JSON（HTTP ${res.status}）`);
	}

	return { status: res.status, data };
}

function finalizeResponse(
	base: string,
	status: number,
	data: CreateShareResponse,
): CreateShareResponse {
	const ok = Boolean(data.success || data.ok);
	if (status >= 400 || !ok) {
		throw new Error(data.error || `发布失败（HTTP ${status}）`);
	}

	if (!data.url) {
		if (data.slug) {
			// 与网站 buildPublicShareUrl 一致：https://htmlto.link/{slug}
			data.url = `${base}/${data.slug}`;
		} else {
			throw new Error("发布成功但未返回链接");
		}
	}

	return data;
}

/**
 * 创建或更新分享页
 * - 有 slug + updateToken 时：PUT 更新同一 URL
 * - 更新失败（过期/无权限/接口不存在）：回退为 POST 新建
 */
export async function createSharePage(
	settings: HtmltoLinkSettings,
	payload: CreateShareRequest,
): Promise<CreateShareResponse> {
	const base = settings.apiBaseUrl.replace(/\/+$/, "");
	const apiToken = settings.apiToken.trim();

	// 1) 尝试更新已有分享
	if (payload.slug && payload.updateToken) {
		const updateUrl = `${base}/api/shares/${encodeURIComponent(payload.slug)}`;
		try {
			const { status, data } = await requestJson(
				updateUrl,
				"PUT",
				buildBody(settings, payload, true),
				apiToken,
			);

			// 404/403/405：分享失效或服务端尚未支持更新 → 走新建
			if (status === 404 || status === 403 || status === 405) {
				// fall through to create
			} else {
				return finalizeResponse(base, status, {
					...data,
					// 更新成功时服务端可能不回传 token，沿用本地的
					updateToken: data.updateToken || payload.updateToken,
					slug: data.slug || payload.slug,
					updated: true,
				});
			}
		} catch (err) {
			// 网络类错误直接抛出；业务失败则新建
			const message = err instanceof Error ? err.message : String(err);
			if (message.includes("网络请求失败")) {
				throw err;
			}
			// fall through
		}
	}

	// 2) 新建分享
	const createUrl = `${base}/api/shares`;
	const { status, data } = await requestJson(
		createUrl,
		"POST",
		buildBody(settings, payload, false),
		apiToken,
	);

	return finalizeResponse(base, status, data);
}
