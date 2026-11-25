export type PublishRegion = "cn" | "intl";

const INTL_ORIGIN = "https://htmlto.link";
const CN_ORIGIN = "https://htmlto.cn";

export function isPublishRegion(value: string | null | undefined): value is PublishRegion {
	return value === "cn" || value === "intl";
}

export function originForRegion(region: PublishRegion): string {
	return region === "cn" ? CN_ORIGIN : INTL_ORIGIN;
}

function hostnameOf(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return "";
	try {
		return new URL(trimmed).hostname.toLowerCase().replace(/\.$/, "");
	} catch {
		return "";
	}
}

export function isOfficialPublishHost(hostname: string): boolean {
	const host = hostname.toLowerCase().replace(/\.$/, "");
	return (
		host === "htmlto.link" ||
		host === "www.htmlto.link" ||
		host === "htmlto.cn" ||
		host === "www.htmlto.cn"
	);
}

/** 只有官方两个站点会被这次选择改写。自定义 API 地址保持不动。 */
export function isManagedPublishBase(base: string): boolean {
	const host = hostnameOf(base);
	return host === "" || isOfficialPublishHost(host);
}

export function regionFromBaseUrl(base: string): PublishRegion {
	const host = hostnameOf(base);
	if (host === "htmlto.cn" || host === "www.htmlto.cn" || host.endsWith(".htmlto.cn")) {
		return "cn";
	}
	return "intl";
}

/**
 * 国内分享链接用 htmlto.cn。服务端有时仍回 htmlto.link，复制出去的地址按所选站点改写。
 */
export function shareUrlForRegion(url: string, region: PublishRegion): string {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return url;
	}

	const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
	if (isOfficialPublishHost(host)) {
		parsed.protocol = "https:";
		parsed.hostname = region === "cn" ? "htmlto.cn" : "htmlto.link";
		parsed.port = "";
		return parsed.href;
	}

	const labels = host.split(".");
	if (
		region === "cn" &&
		labels.length === 3 &&
		labels[1] === "htmlto" &&
		labels[2] === "link"
	) {
		const slug = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
		if (/^[A-Za-z0-9_-]+$/.test(slug)) return `${CN_ORIGIN}/${slug}`;
	}

	return url;
}
