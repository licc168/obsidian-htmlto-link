/** 单篇笔记对应的分享记录（同一笔记复用同一 URL） */
export interface NoteShareRecord {
	slug: string;
	updateToken: string;
	url: string;
	updatedAt: string;
}

/** 插件界面语言：auto 跟随 Obsidian，en/zh 手动指定 */
export type PluginLanguage = "auto" | "en" | "zh";

export interface HtmltoLinkSettings {
	/** 服务端根地址，默认 https://htmlto.link */
	apiBaseUrl: string;
	/** 模板 id，对应网站 imageTextTemplates（接口只认 id，与显示名无关） */
	templateId: string;
	/** 主题 class，可为空（接口只认 value，与显示名无关） */
	themeClass: string;
	/** 卡片宽度 */
	cardWidth: number;
	/** API Token（留空则走游客接口，链接仅保留 24 小时） */
	apiToken: string;
	/** 插件界面语言 */
	language: PluginLanguage;
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
	templateId: "plain",
	themeClass: "",
	cardWidth: 440,
	language: "auto",
	copyLinkOnSuccess: true,
	openInBrowser: false,
	appendLinkToNote: false,
	showOptionsOnPublish: true,
	noteShares: {},
};

/**
 * 与网站 imageTextTemplates 对齐。
 * id 会原样传给 API；nameKey 仅用于 UI 多语言显示。
 */
export const TEMPLATE_OPTIONS: Array<{ id: string; nameKey: string }> = [
	{ id: "memo", nameKey: "tplMemo" },
	{ id: "popart", nameKey: "tplPopart" },
	{ id: "traditionalchinese", nameKey: "tplTraditionalChinese" },
	{ id: "coilnotebook", nameKey: "tplCoilNotebook" },
	{ id: "purpleticket", nameKey: "tplPurpleTicket" },
	{ id: "bytedance", nameKey: "tplBytedance" },
	{ id: "warm", nameKey: "tplWarm" },
	{ id: "alibaba", nameKey: "tplAlibaba" },
	{ id: "notebook", nameKey: "tplNotebook" },
	{ id: "darktech", nameKey: "tplDarktech" },
	{ id: "fairytale", nameKey: "tplFairytale" },
	{ id: "boardgamestyle", nameKey: "tplBoardgame" },
	{ id: "cyberpunk", nameKey: "tplCyberpunk" },
	{ id: "glassmorphism", nameKey: "tplGlassmorphism" },
	{ id: "neonglow", nameKey: "tplNeonglow" },
	{ id: "vintagenewspaper", nameKey: "tplVintageNewspaper" },
	{ id: "handwrittennote", nameKey: "tplHandwritten" },
	{ id: "vintagemap", nameKey: "tplVintageMap" },
	{ id: "blueprint", nameKey: "tplBlueprint" },
	{ id: "botanical", nameKey: "tplBotanical" },
	{ id: "sketch", nameKey: "tplSketch" },
	{ id: "terminal", nameKey: "tplTerminal" },
	{ id: "retro", nameKey: "tplRetro" },
	{ id: "ayulight", nameKey: "tplAyulight" },
	{ id: "bauhaus", nameKey: "tplBauhaus" },
	{ id: "greensimple", nameKey: "tplGreensimple" },
	{ id: "maximalism", nameKey: "tplMaximalism" },
	{ id: "neobrutalism", nameKey: "tplNeobrutalism" },
	{ id: "newsprint", nameKey: "tplNewsprint" },
	{ id: "organic", nameKey: "tplOrganic" },
	{ id: "playfulgeometric", nameKey: "tplPlayfulGeometric" },
	{ id: "professional", nameKey: "tplProfessional" },
	{ id: "plain", nameKey: "tplPlain" },
];

/**
 * 与网站 templateThemes 对齐。
 * value 会原样传给 API；labelKey 仅用于 UI 多语言显示。
 */
export const TEMPLATE_THEMES: Record<
	string,
	Array<{ value: string; labelKey: string }>
> = {
	memo: [
		{ value: "bright-mode", labelKey: "themeBright" },
		{ value: "dark-mode", labelKey: "themeDark" },
	],
	popart: [
		{ value: "candy-mode", labelKey: "themeCandy" },
		{ value: "mint-mode", labelKey: "themeMint" },
		{ value: "purple-mode", labelKey: "themePurple" },
		{ value: "yellow-mode", labelKey: "themeYellow" },
		{ value: "hot-red-mode", labelKey: "themeHotRed" },
		{ value: "forest-green-mode", labelKey: "themeForestGreen" },
		{ value: "ocean-blue-mode", labelKey: "themeOceanBlue" },
		{ value: "pink-blue-mode", labelKey: "themePinkBlue" },
		{ value: "neon-pink-mode", labelKey: "themeNeonPink" },
		{ value: "retro-orange-mode", labelKey: "themeRetroOrange" },
	],
	coilnotebook: [
		{ value: "blue-mode", labelKey: "themeBlue" },
		{ value: "pink-mode", labelKey: "themePink" },
		{ value: "mint-mode", labelKey: "themeMint" },
		{ value: "yellow-mode", labelKey: "themeWarmYellow" },
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
): Array<{ value: string; labelKey: string }> {
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

/** value 传给 API；labelKey 仅用于 UI 多语言 */
export const CARD_WIDTH_OPTIONS: Array<{ value: number; labelKey: string }> = [
	{ value: 360, labelKey: "widthNarrow" },
	{ value: 440, labelKey: "widthDefault" },
	{ value: 520, labelKey: "widthWide" },
	{ value: 640, labelKey: "widthWider" },
	{ value: 720, labelKey: "widthUltra" },
	{ value: 800, labelKey: "widthReading" },
];
