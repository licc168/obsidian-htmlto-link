import { requestUrl, type RequestUrlResponse } from "obsidian";
import type { HtmltoLinkSettings } from "./constants";
import { t } from "./i18n";
import {
	optionalBoolean,
	optionalString,
	parseJsonObject,
} from "./json";

/** 区分网络错误与业务错误，便于上层决定是否回退到新建 */
class ApiError extends Error {
	isNetwork: boolean;
	constructor(message: string, isNetwork = false) {
		super(message);
		this.isNetwork = isNetwork;
	}
}

export interface CreateShareRequest {
	/** Markdown 正文（服务端字段名是 content） */
	content: string;
	templateId: string;
	title?: string;
	themeClass?: string;
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

export interface CreateShareResult extends CreateShareResponse {
	url: string;
}

function parseCreateShareResponse(text: string): CreateShareResponse {
	const object = parseJsonObject(text);
	return {
		success: optionalBoolean(object, "success"),
		ok: optionalBoolean(object, "ok"),
		slug: optionalString(object, "slug"),
		url: optionalString(object, "url"),
		updateToken: optionalString(object, "updateToken"),
		updated: optionalBoolean(object, "updated"),
		temporary: optionalBoolean(object, "temporary"),
		expiresAt: optionalString(object, "expiresAt"),
		error: optionalString(object, "error"),
	};
}

function buildBody(
	settings: HtmltoLinkSettings,
	payload: CreateShareRequest,
	includeToken = false,
): Record<string, unknown> {
	const body: Record<string, unknown> = {
		content: payload.content,
		templateId: payload.templateId,
		title: payload.title || "Shared note",
		channel: "obsidian",
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

	let res: RequestUrlResponse;
	try {
		res = await requestUrl({
			url,
			method,
			headers,
			body: JSON.stringify(body),
			throw: false,
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		throw new ApiError(t("networkFailed") + message, true);
	}

	let data: CreateShareResponse;
	try {
		data = parseCreateShareResponse(res.text);
	} catch {
		throw new ApiError(t("invalidJson") + res.status + ")", false);
	}

	return { status: res.status, data };
}

function finalizeResponse(
	base: string,
	status: number,
	data: CreateShareResponse,
): CreateShareResult {
	const ok = Boolean(data.success || data.ok);
	if (status >= 400 || !ok) {
		throw new ApiError(data.error || t("httpFailed") + status + ")", false);
	}

	const url = data.url ?? (data.slug ? `${base}/${data.slug}` : undefined);
	if (!url) {
		throw new ApiError(t("noUrl"), false);
	}

	return { ...data, url };
}

/**
 * 删除分享页
 * DELETE /api/shares/:slug  body: { updateToken }
 */
export async function deleteSharePage(
	settings: HtmltoLinkSettings,
	slug: string,
	updateToken: string,
): Promise<void> {
	const base = settings.apiBaseUrl.replace(/\/+$/, "");
	const apiToken = settings.apiToken.trim();
	const url = `${base}/api/shares/${encodeURIComponent(slug)}`;

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Accept: "application/json",
	};
	if (apiToken) {
		headers["Authorization"] = `Bearer ${apiToken}`;
	}

	let res: RequestUrlResponse;
	try {
		res = await requestUrl({
			url,
			method: "DELETE",
			headers,
			body: JSON.stringify({ updateToken }),
			throw: false,
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		throw new ApiError(t("networkFailed") + message, true);
	}

	if (res.status >= 400) {
		let errMsg = t("httpFailed") + res.status + ")";
		try {
			const data = parseJsonObject(res.text);
			const serverMessage = optionalString(data, "error");
			if (serverMessage) errMsg = serverMessage;
		} catch {
			// ignore parse error
		}
		throw new ApiError(errMsg, false);
	}
}

/**
 * 创建或更新分享页
 * - 有 slug + updateToken 时：PUT 更新同一 URL
 * - 更新失败（过期/无权限/接口不存在）：回退为 POST 新建
 */
export async function createSharePage(
	settings: HtmltoLinkSettings,
	payload: CreateShareRequest,
): Promise<CreateShareResult> {
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
		} catch (err: unknown) {
			// 网络类错误直接抛出；业务失败则新建
			if (err instanceof ApiError && err.isNetwork) {
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
