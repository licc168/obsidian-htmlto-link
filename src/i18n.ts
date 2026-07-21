import { App } from "obsidian";
import type { PluginLanguage } from "./constants";

/**
 * 多语言文案。
 * - language = auto：跟随 Obsidian 界面语言（中文 → zh，其它 → en）
 * - language = en / zh：手动指定
 */
const dict = {
  en: {
    // settings
    settingsTitle: "Share Page",
    settingsDesc:
      "Instantly share your current note as a beautiful webpage and get a public link.",
    apiUrlName: "API URL",
    apiUrlDesc:
      "Default https://htmlto.link. Change it if you self-host the service.",
    apiTokenName: "API Token",
    apiTokenDesc:
      "Leave empty to publish as a guest (link kept for 24h). Fill in your API Token from the website's Settings → API Token to bind the link to your account for a longer lifetime.",
    defaultTemplateName: "Default template",
    defaultTemplateDesc: "Card template used when publishing.",
    defaultThemeName: "Default theme",
    defaultThemeDesc: "Color theme for the current template.",
    cardWidthName: "Card width",
    cardWidthDesc: "Width of the share card in pixels.",
    showOptionsName: "Choose template & width on publish",
    showOptionsDesc:
      "When enabled, a dialog appears each publish. Your last choice is remembered and used as the default next time.",
    copyOnSuccessName: "Auto-copy link on success",
    copyOnSuccessDesc:
      "Automatically copy the link when the success dialog opens (you can still click 'Copy link' inside it).",
    openBrowserName: "Open in browser after publish",
    openBrowserDesc: "Open the share page in your system browser after success.",
    appendLinkName: "Append link to note",
    appendLinkDesc: "Append the share link at the bottom of the current note.",
    tipsTitle: "Notes",
    tipTokenFilled:
      "API Token set: the share link belongs to your account and lasts longer per your plan.",
    tipTokenGuest:
      "Without a Token you publish as a guest: the share link is kept for only 24 hours.",
    tipThemes:
      "Only Memo / Pop Art / Coil Notebook support multiple themes; others use a fixed style.",
    tipImages:
      "Local images are not uploaded automatically. Use external image links or upload to an image host first.",
    tipCommand: "Run 'Share current note' from the command palette to publish.",
    commandPublish: "Share current note",
    commandSettings: "Open settings",
    languageName: "Language",
    languageDesc:
      "Plugin UI language. Auto follows Obsidian's language. Restart or re-open dialogs after switching.",
    languageAuto: "Auto (follow Obsidian)",
    languageEn: "English",
    languageZh: "中文",

    // publish modal
    publishTitle: "Share Page",
    notePrefix: "Note: ",
    templateName: "Template",
    templateDesc: "Defaults to your last template; you can change it anytime.",
    themeName: "Theme",
    themeDesc: "This template supports multiple color themes.",
    modalCardWidthDesc: "Defaults to your last width; you can change it anytime.",
    publishing: "Sharing, please wait…",
    publishFailedPrefix: "Share failed: ",
    cancel: "Cancel",
    publishingBtn: "Sharing…",
    publishBtn: "Share",
    updatedTitle: "Share updated",
    successTitle: "Shared successfully",
    shareLinkLabel: "Share link",
    autoCopied: "Link auto-copied to clipboard",
    clickToCopy: "Click the button below to copy the link",
    openLink: "Open link",
    copied: "Copied",
    copyLink: "Copy link",
    copyFailed: "Copy failed. Select the link and press Ctrl+C manually.",
    close: "Close",
    noticeCopied: "Link copied",

    // publish flow
    errNoView: "Please open a Markdown note first.",
    errNoFile: "No shareable note file found.",
    errEmpty: "Note is empty, cannot share.",
    publishingNotice: "Sharing page…",
    publishFailed: "Share failed: ",
    guestNoteExpiryGuest:
      "Guest share: link expires at {time} (kept for 24h). Add an API Token to bind it to your account for a longer lifetime.",
    guestNoteExpiryUser: "Link expires at {time} (bound to your account).",
    guestNoteGuestSimple:
      "Guest share: link kept for only 24 hours. Add an API Token for a longer lifetime.",
    guestWarning:
      "No API Token set — this is a guest share: the share link is kept for only 24 hours. Add a Token in plugin settings for a longer lifetime.",
    appendStamp: "Share link ({time}): ",

    // api errors
    networkFailed: "Network request failed: ",
    invalidJson: "Server returned non-JSON (HTTP ",
    noUrl: "Shared but no link returned",
    httpFailed: "Share failed (HTTP ",

    // template names (UI only; API uses id)
    tplMemo: "Memo",
    tplPopart: "Pop Art",
    tplTraditionalChinese: "Traditional Chinese",
    tplCoilNotebook: "Coil Notebook",
    tplPurpleTicket: "Purple Ticket",
    tplBytedance: "ByteDance",
    tplWarm: "Warm Soft",
    tplAlibaba: "Alibaba Orange",
    tplNotebook: "Notebook",
    tplDarktech: "Dark Tech",
    tplFairytale: "Fairy Tale",
    tplBoardgame: "Board Game",
    tplCyberpunk: "Cyberpunk",
    tplGlassmorphism: "Glassmorphism",
    tplNeonglow: "Neon Glow",
    tplVintageNewspaper: "Vintage Newspaper",
    tplHandwritten: "Handwritten Note",
    tplVintageMap: "Vintage Map",
    tplBlueprint: "Blueprint",
    tplBotanical: "Botanical",
    tplSketch: "Sketch",
    tplTerminal: "Terminal",
    tplRetro: "Retro Win95",
    tplAyulight: "Ayu Light",
    tplBauhaus: "Bauhaus",
    tplGreensimple: "Fresh Green",
    tplMaximalism: "Maximalism",
    tplNeobrutalism: "Neo Brutalism",
    tplNewsprint: "Newsprint",
    tplOrganic: "Wabi-sabi Ceramic",
    tplPlayfulGeometric: "Playful Geometric",
    tplProfessional: "Professional",
    tplPlain: "Plain",

    // theme labels (UI only; API uses value)
    themeBright: "Bright",
    themeDark: "Dark",
    themeCandy: "Candy",
    themeMint: "Mint",
    themePurple: "Purple",
    themeYellow: "Yellow",
    themeHotRed: "Hot Red",
    themeForestGreen: "Forest Green",
    themeOceanBlue: "Ocean Blue",
    themePinkBlue: "Pink Blue",
    themeNeonPink: "Neon Pink",
    themeRetroOrange: "Retro Orange",
    themeBlue: "Ocean Blue",
    themePink: "Pink",
    themeWarmYellow: "Warm Yellow",

    // card width labels (UI only; API uses number)
    widthNarrow: "360px (Narrow)",
    widthDefault: "440px (Default)",
    widthWide: "520px (Wide)",
    widthWider: "640px (Wider)",
    widthUltra: "720px (Ultra)",
    widthReading: "800px (Reading)",
  },
  zh: {
    settingsTitle: "Share Page",
    settingsDesc: "一键将当前笔记分享为精美网页，并复制公开链接。",
    apiUrlName: "API 地址",
    apiUrlDesc: "默认 https://htmlto.link，自建部署可改成你的域名。",
    apiTokenName: "API Token",
    apiTokenDesc:
      "留空则作为游客发布，分享链接仅保留 24 小时。填入网站「设置 → API Token」可让链接归属你的账号并享受更长的有效期。",
    defaultTemplateName: "默认模板",
    defaultTemplateDesc: "发布时使用的卡片模板。",
    defaultThemeName: "默认主题",
    defaultThemeDesc: "当前模板支持多种主题配色。",
    cardWidthName: "卡片宽度",
    cardWidthDesc: "分享页卡片宽度（像素）。",
    showOptionsName: "发布时选择模板和宽度",
    showOptionsDesc:
      "开启后每次发布弹出选择框；选过一次会自动记住，下次默认选中上次的模板和宽度。",
    copyOnSuccessName: "发布后自动复制链接",
    copyOnSuccessDesc:
      "成功弹窗打开时，是否同时自动复制链接（弹窗里仍可再点「复制链接」）。",
    openBrowserName: "发布后打开浏览器",
    openBrowserDesc: "成功后在系统浏览器中打开分享页。",
    appendLinkName: "在笔记末尾追加链接",
    appendLinkDesc: "发布成功后，在当前笔记底部追加分享链接。",
    tipsTitle: "说明",
    tipTokenFilled: "已填写 API Token：分享链接归属于你的账号，按套餐享受更长有效期。",
    tipTokenGuest: "未填写 Token 时走游客模式：分享链接仅保留 24 小时。",
    tipThemes: "仅「备忘录 / 波普艺术 / 线圈笔记本」支持多主题，其他模板为固定样式。",
    tipImages: "本地图片暂不自动上传，建议使用外链图或先上传到图床。",
    tipCommand: "命令面板搜索「分享当前笔记」即可分享当前笔记。",
    commandPublish: "分享当前笔记",
    commandSettings: "打开设置",
    languageName: "界面语言",
    languageDesc:
      "插件界面语言。自动跟随 Obsidian 语言。切换后重新打开弹窗/设置页即可生效。",
    languageAuto: "自动（跟随 Obsidian）",
    languageEn: "English",
    languageZh: "中文",

    publishTitle: "Share Page",
    notePrefix: "笔记：",
    templateName: "模板",
    templateDesc: "默认选中上次使用的模板，可随时改。",
    themeName: "主题",
    themeDesc: "该模板支持多种主题配色。",
    modalCardWidthDesc: "默认选中上次使用的宽度，可随时改。",
    publishing: "正在分享，请稍候…",
    publishFailedPrefix: "分享失败：",
    cancel: "取消",
    publishingBtn: "分享中…",
    publishBtn: "分享",
    updatedTitle: "已更新分享",
    successTitle: "分享成功",
    shareLinkLabel: "分享链接",
    autoCopied: "链接已自动复制到剪贴板",
    clickToCopy: "点击下方按钮复制链接",
    openLink: "打开链接",
    copied: "已复制",
    copyLink: "复制链接",
    copyFailed: "复制失败，请手动全选链接后 Ctrl+C。",
    close: "关闭",
    noticeCopied: "链接已复制",

    errNoView: "请先打开一篇 Markdown 笔记。",
    errNoFile: "当前没有可分享的笔记文件。",
    errEmpty: "笔记内容为空，无法分享。",
    publishingNotice: "正在分享页面…",
    publishFailed: "分享失败：",
    guestNoteExpiryGuest:
      "游客分享：链接将在 {time} 过期（保留 24 小时）。填写 API Token 可归属你的账号并延长有效期。",
    guestNoteExpiryUser: "链接将在 {time} 过期（已绑定你的账号）。",
    guestNoteGuestSimple: "游客分享：链接仅保留 24 小时。填写 API Token 可延长有效期。",
    guestWarning:
      "未填写 API Token，本次为游客分享：分享链接仅保留 24 小时。可在插件设置中填写 Token 延长有效期。",
    appendStamp: "分享链接（{time}）：",

    networkFailed: "网络请求失败：",
    invalidJson: "服务器返回非 JSON（HTTP ",
    noUrl: "分享成功但未返回链接",
    httpFailed: "分享失败（HTTP ",

    // template names
    tplMemo: "备忘录",
    tplPopart: "波普艺术",
    tplTraditionalChinese: "中国传统",
    tplCoilNotebook: "线圈笔记本",
    tplPurpleTicket: "紫色小红书",
    tplBytedance: "字节范",
    tplWarm: "温暖柔和",
    tplAlibaba: "阿里橙",
    tplNotebook: "笔记本",
    tplDarktech: "黑色科技",
    tplFairytale: "儿童童话",
    tplBoardgame: "桌游风格",
    tplCyberpunk: "赛博朋克",
    tplGlassmorphism: "玻璃拟态",
    tplNeonglow: "霓虹发光",
    tplVintageNewspaper: "复古报纸",
    tplHandwritten: "手写笔记",
    tplVintageMap: "古旧地图",
    tplBlueprint: "蓝图技术",
    tplBotanical: "植物图鉴",
    tplSketch: "手绘涂鸦",
    tplTerminal: "终端命令行",
    tplRetro: "复古Win95",
    tplAyulight: "Ayu暖光",
    tplBauhaus: "包豪斯",
    tplGreensimple: "清新绿",
    tplMaximalism: "极繁主义",
    tplNeobrutalism: "新粗野主义",
    tplNewsprint: "报纸印刷",
    tplOrganic: "侘寂陶艺",
    tplPlayfulGeometric: "活泼几何",
    tplProfessional: "专业商务",
    tplPlain: "简洁",

    // theme labels
    themeBright: "高亮",
    themeDark: "暗黑",
    themeCandy: "糖果色",
    themeMint: "薄荷绿",
    themePurple: "紫色",
    themeYellow: "黄色",
    themeHotRed: "热辣红",
    themeForestGreen: "森林绿",
    themeOceanBlue: "海洋蓝",
    themePinkBlue: "粉蓝",
    themeNeonPink: "霓虹粉",
    themeRetroOrange: "复古橙",
    themeBlue: "海蓝",
    themePink: "粉色",
    themeWarmYellow: "暖黄",

    // card width labels
    widthNarrow: "360px（窄）",
    widthDefault: "440px（默认）",
    widthWide: "520px（宽）",
    widthWider: "640px（更宽）",
    widthUltra: "720px（超宽）",
    widthReading: "800px（阅读宽）",
  },
};

let currentLang: "en" | "zh" = "en";

/** 从多个来源探测 Obsidian 界面是否为中文 */
function detectObsidianIsZh(app: App): boolean {
  // 1) 官方 API（Obsidian 1.5+）
  const apiLang = (
    app as App & { getLanguage?: () => string }
  ).getLanguage?.();
  if (apiLang && apiLang.toLowerCase().startsWith("zh")) return true;
  if (apiLang && !apiLang.toLowerCase().startsWith("zh")) return false;

  // 2) Obsidian 本地存储的语言偏好
  try {
    const stored =
      window.localStorage?.getItem("language") ||
      window.localStorage?.getItem("locale");
    if (stored && stored.toLowerCase().startsWith("zh")) return true;
    if (stored && stored.length > 0 && !stored.toLowerCase().startsWith("zh")) {
      return false;
    }
  } catch {
    // ignore
  }

  // 3) moment locale（Obsidian 内置）
  try {
    const momentLocale = (window as any).moment?.locale?.();
    if (typeof momentLocale === "string" && momentLocale.toLowerCase().startsWith("zh")) {
      return true;
    }
  } catch {
    // ignore
  }

  // 4) 浏览器语言兜底
  const nav = (navigator.language || "").toLowerCase();
  return nav.startsWith("zh");
}

/**
 * 初始化 / 切换语言。
 * @param preference auto | en | zh
 */
export function initI18n(app: App, preference: PluginLanguage = "auto"): void {
  if (preference === "en") {
    currentLang = "en";
    return;
  }
  if (preference === "zh") {
    currentLang = "zh";
    return;
  }
  // auto
  currentLang = detectObsidianIsZh(app) ? "zh" : "en";
}

export function getCurrentLang(): "en" | "zh" {
  return currentLang;
}

export function t(
  key: keyof typeof dict.en,
  vars?: Record<string, string | number>,
): string {
  let str: string = (dict as any)[currentLang]?.[key] ?? dict.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}

/** 时间与日期格式所用的 locale（跟随当前语言） */
export function timeLocale(): string {
  return currentLang === "zh" ? "zh-CN" : "en-US";
}
