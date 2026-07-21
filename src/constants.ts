export interface HtmltoLinkSettings {
	/** 服务端根地址，默认 https://htmlto.link */
	apiBaseUrl: string;
	/** 模板 id，对应网站 imageTextTemplates */
	templateId: string;
	/** 主题 class，可为空 */
	themeClass: string;
	/** 卡片宽度 */
	cardWidth: number;
	/** 成功后复制链接 */
	copyLinkOnSuccess: boolean;
	/** 成功后打开浏览器 */
	openInBrowser: boolean;
	/** 成功后在笔记末尾追加链接 */
	appendLinkToNote: boolean;
}

export const DEFAULT_SETTINGS: HtmltoLinkSettings = {
	apiBaseUrl: "https://htmlto.link",
	templateId: "memo",
	themeClass: "bright-mode",
	cardWidth: 440,
	copyLinkOnSuccess: true,
	openInBrowser: false,
	appendLinkToNote: false,
};

/** 与网站 lib/constants.ts 中 imageTextTemplates 对齐的常用模板 */
export const TEMPLATE_OPTIONS: Array<{ id: string; name: string }> = [
	{ id: "memo", name: "备忘录" },
	{ id: "popart", name: "波普艺术" },
	{ id: "traditionalchinese", name: "中国传统" },
	{ id: "coilnotebook", name: "线圈笔记本" },
	{ id: "purpleticket", name: "紫色票据" },
];

export const CARD_WIDTH_OPTIONS: Array<{ value: number; label: string }> = [
	{ value: 360, label: "360px（窄）" },
	{ value: 440, label: "440px（默认）" },
	{ value: 520, label: "520px（宽）" },
	{ value: 640, label: "640px（更宽）" },
];
