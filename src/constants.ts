/** 单篇笔记对应的分享记录（同一笔记复用同一 URL） */
export interface NoteShareRecord {
	slug: string;
	updateToken: string;
	url: string;
	updatedAt: string;
}

export interface HtmltoLinkSettings {
	/** 服务端根地址，默认 https://htmlto.link */
	apiBaseUrl: string;
	/** 模板 id，对应网站 imageTextTemplates */
	templateId: string;
	/** 主题 class，可为空 */
	themeClass: string;
	/** 卡片宽度 */
	cardWidth: number;
	/** API Token（留空则走游客接口，链接仅保留 24 小时） */
	apiToken: string;
	/** 成功后复制链接 */
	copyLinkOnSuccess: boolean;
	/** 成功后打开浏览器 */
	openInBrowser: boolean;
	/** 成功后在笔记末尾追加链接 */
	appendLinkToNote: boolean;
	/** 发布时是否弹出模板/宽度选择框 */
	showOptionsOnPublish: boolean;
	/**
	 * 按笔记路径记录已发布的 slug / updateToken
	 * key = TFile.path
	 */
	noteShares: Record<string, NoteShareRecord>;
}

export const DEFAULT_SETTINGS: HtmltoLinkSettings = {
	apiBaseUrl: "https://htmlto.link",
	apiToken: "",
	templateId: "memo",
	themeClass: "bright-mode",
	cardWidth: 440,
	copyLinkOnSuccess: true,
	openInBrowser: false,
	appendLinkToNote: false,
	showOptionsOnPublish: true,
	noteShares: {},
};

/** 与网站 lib/constants.ts 中 imageTextTemplates 对齐 */
export const TEMPLATE_OPTIONS: Array<{ id: string; name: string }> = [
	{ id: "memo", name: "备忘录" },
	{ id: "popart", name: "波普艺术" },
	{ id: "traditionalchinese", name: "中国传统" },
	{ id: "coilnotebook", name: "线圈笔记本" },
	{ id: "purpleticket", name: "紫色小红书" },
	{ id: "bytedance", name: "字节范" },
	{ id: "warm", name: "温暖柔和" },
	{ id: "alibaba", name: "阿里橙" },
	{ id: "notebook", name: "笔记本" },
	{ id: "darktech", name: "黑色科技" },
	{ id: "fairytale", name: "儿童童话" },
	{ id: "boardgamestyle", name: "桌游风格" },
	{ id: "cyberpunk", name: "赛博朋克" },
	{ id: "glassmorphism", name: "玻璃拟态" },
	{ id: "neonglow", name: "霓虹发光" },
	{ id: "vintagenewspaper", name: "复古报纸" },
	{ id: "handwrittennote", name: "手写笔记" },
	{ id: "vintagemap", name: "古旧地图" },
	{ id: "blueprint", name: "蓝图技术" },
	{ id: "botanical", name: "植物图鉴" },
	{ id: "sketch", name: "手绘涂鸦" },
	{ id: "terminal", name: "终端命令行" },
	{ id: "retro", name: "复古Win95" },
	{ id: "ayulight", name: "Ayu暖光" },
	{ id: "bauhaus", name: "包豪斯" },
	{ id: "greensimple", name: "清新绿" },
	{ id: "maximalism", name: "极繁主义" },
	{ id: "neobrutalism", name: "新粗野主义" },
	{ id: "newsprint", name: "报纸印刷" },
	{ id: "organic", name: "侘寂陶艺" },
	{ id: "playfulgeometric", name: "活泼几何" },
	{ id: "professional", name: "专业商务" },
];

/**
 * 与网站 lib/constants.ts 中 templateThemes 对齐
 * 只有部分模板支持多主题
 */
export const TEMPLATE_THEMES: Record<
	string,
	Array<{ label: string; value: string }>
> = {
	memo: [
		{ label: "高亮", value: "bright-mode" },
		{ label: "暗黑", value: "dark-mode" },
	],
	popart: [
		{ label: "糖果色", value: "candy-mode" },
		{ label: "薄荷绿", value: "mint-mode" },
		{ label: "紫色", value: "purple-mode" },
		{ label: "黄色", value: "yellow-mode" },
		{ label: "热辣红", value: "hot-red-mode" },
		{ label: "森林绿", value: "forest-green-mode" },
		{ label: "海洋蓝", value: "ocean-blue-mode" },
		{ label: "粉蓝", value: "pink-blue-mode" },
		{ label: "霓虹粉", value: "neon-pink-mode" },
		{ label: "复古橙", value: "retro-orange-mode" },
	],
	coilnotebook: [
		{ label: "海蓝", value: "blue-mode" },
		{ label: "粉色", value: "pink-mode" },
		{ label: "薄荷绿", value: "mint-mode" },
		{ label: "暖黄", value: "yellow-mode" },
	],
};

/** 与网站 defaultThemes 对齐 */
export const DEFAULT_THEMES: Record<string, string> = {
	memo: "bright-mode",
	popart: "candy-mode",
	coilnotebook: "blue-mode",
};

export function getTemplateThemes(
	templateId: string,
): Array<{ label: string; value: string }> {
	return TEMPLATE_THEMES[templateId] ?? [];
}

export function hasMultiThemes(templateId: string): boolean {
	return getTemplateThemes(templateId).length > 0;
}

/** 取模板默认主题；无多主题时返回空字符串 */
export function getDefaultThemeClass(templateId: string): string {
	const themes = getTemplateThemes(templateId);
	if (themes.length === 0) return "";
	const preferred = DEFAULT_THEMES[templateId];
	if (preferred && themes.some((t) => t.value === preferred)) {
		return preferred;
	}
	return themes[0].value;
}

/**
 * 切换模板时校正 themeClass：
 * - 无多主题 → 清空
 * - 有多主题但当前值不在列表 → 用该模板默认
 */
export function resolveThemeClassForTemplate(
	templateId: string,
	currentThemeClass?: string,
): string {
	const themes = getTemplateThemes(templateId);
	if (themes.length === 0) return "";
	const current = (currentThemeClass ?? "").trim();
	if (current && themes.some((t) => t.value === current)) {
		return current;
	}
	return getDefaultThemeClass(templateId);
}

export const CARD_WIDTH_OPTIONS: Array<{ value: number; label: string }> = [
	{ value: 360, label: "360px（窄）" },
	{ value: 440, label: "440px（默认）" },
	{ value: 520, label: "520px（宽）" },
	{ value: 640, label: "640px（更宽）" },
	{ value: 720, label: "720px（超宽）" },
	{ value: 800, label: "800px（阅读宽）" },
];
