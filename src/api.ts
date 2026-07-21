import type { HtmltoLinkSettings } from "./constants";

export interface CreateShareRequest {
	markdown: string;
	templateId: string;
	themeClass?: string;
	cardWidth?: number;
	/** 可选：自定义背景 CSS */
	background?: string;
	/** 可选：字体 CSS 值 */
	font?: string;
}

export interface CreateShareResponse {
	ok: boolean;
	id?: string;
	url?: string;
	expiresAt?: string;
	error?: string;
}

/**
 * 调用 htmlto.link 游客分享接口
 * POST /api/shares
 */
export async function createSharePage(
	settings: HtmltoLinkSettings,
	payload: CreateShareRequest,
): Promise<CreateShareResponse> {
	const base = settings.apiBaseUrl.replace(/\/+$/, "");
	const endpoint = `${base}/api/shares`;

	const body: Record<string, unknown> = {
		markdown: payload.markdown,
		templateId: payload.templateId,
		cardWidth: payload.cardWidth ?? settings.cardWidth,
	};

	if (payload.themeClass || settings.themeClass) {
		body.themeClass = payload.themeClass || settings.themeClass;
	}
	if (payload.background) body.background = payload.background;
	if (payload.font) body.font = payload.font;

	const res = await fetch(endpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify(body),
	});

	let data: CreateShareResponse;
	try {
		data = (await res.json()) as CreateShareResponse;
	} catch {
		throw new Error(`服务器返回非 JSON（HTTP ${res.status}）`);
	}

	if (!res.ok || !data.ok) {
		throw new Error(data.error || `发布失败（HTTP ${res.status}）`);
	}

	if (!data.url) {
		throw new Error("发布成功但未返回链接");
	}

	return data;
}
