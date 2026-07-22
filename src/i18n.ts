import { getLanguage, type App } from "obsidian";
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
    apiTokenName: "API Token",
    apiTokenDesc:
      "Leave empty to publish as a guest (link kept for 24 hours). For a longer lifetime: 1) Sign in at htmlto.link 2) Open Settings → API Token 3) Copy the token and paste it here.",
    apiTokenPlaceholder: "Paste your API Token",
    apiTokenHelpLink: "Open htmlto.link → Settings to get your Token",
    apiTokenHelpTooltip: "Open website settings to get API Token",
    defaultTemplateName: "Default template",
    defaultTemplateDesc: "Card template used when publishing.",
    defaultThemeName: "Default theme",
    defaultThemeDesc: "Color theme for the current template.",
    showOptionsName: "Choose template on publish",
    showOptionsDesc:
      "When enabled, a dialog appears each publish. Your last choice is remembered and used as the default next time.",
    copyOnSuccessName: "Auto-copy link on success",
    copyOnSuccessDesc:
      "Automatically copy the link when the success dialog opens (you can still click 'Copy link' inside it).",
    openBrowserName: "Open in browser after publish",
    openBrowserDesc: "Open the share page in your system browser after success.",
    writeFrontmatterName: "Write share info to frontmatter",
    writeFrontmatterDesc:
      "After sharing, write share_link and share_updated into the note's frontmatter (Properties).",
    tipsTitle: "Notes",
    tipTokenFilled:
      "API Token set: the share link belongs to your account and lasts longer per your plan.",
    tipTokenGuest:
      "Without a Token you publish as a guest: the share link is kept for only 24 hours.",
    tipTokenHowToPrefix: "How to get a Token: open ",
    tipTokenHowToSuffix:
      " → sign in → copy API Token → paste above.",
    tipThemes:
      "Only Memo / Pop Art / Coil Notebook support multiple themes; others use a fixed style.",
    tipImages:
      "Local images are not uploaded automatically. Use external image links or upload to an image host first.",
    tipCommand: "Run 'Share current note' from the command palette to publish.",
    commandPublish: "Share current note",
    commandDeleteShare: "Delete this shared note",
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
    // delete share
    deleteConfirmTitle: "Delete share",
    deleteConfirmMsg: "Are you sure you want to delete the share for \"{note}\"? The public link will no longer be accessible.",
    deleteConfirmYes: "Delete",
    deleteConfirmNo: "Cancel",
    deletingNotice: "Deleting share…",
    deleteSuccess: "Share deleted successfully.",
    deleteFailed: "Delete failed: ",
    noShareToDelete: "This note has not been shared yet.",

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

  },
  zh: {
    settingsTitle: "Share Page",
    settingsDesc: "一键将当前笔记分享为精美网页，并复制公开链接。",
    apiTokenName: "API Token",
    apiTokenDesc:
      "留空则作为游客发布，分享链接仅保留 24 小时。获取更长有效期：① 打开 htmlto.link 并登录 ② 进入「设置 → API Token」③ 复制后粘贴到此处。",
    apiTokenPlaceholder: "粘贴你的 API Token",
    apiTokenHelpLink: "打开 htmlto.link 设置页获取 Token",
    apiTokenHelpTooltip: "打开网站设置页获取 API Token",
    defaultTemplateName: "默认模板",
    defaultTemplateDesc: "发布时使用的卡片模板。",
    defaultThemeName: "默认主题",
    defaultThemeDesc: "当前模板支持多种主题配色。",
    showOptionsName: "发布时选择模板",
    showOptionsDesc:
      "开启后每次发布弹出选择框；选过一次会自动记住，下次默认选中上次的模板。",
    copyOnSuccessName: "发布后自动复制链接",
    copyOnSuccessDesc:
      "成功弹窗打开时，是否同时自动复制链接（弹窗里仍可再点「复制链接」）。",
    openBrowserName: "发布后打开浏览器",
    openBrowserDesc: "成功后在系统浏览器中打开分享页。",
    writeFrontmatterName: "将分享信息写入笔记属性",
    writeFrontmatterDesc:
      "分享成功后，将 share_link 和 share_updated 写入笔记的 frontmatter（属性）中。",
    tipsTitle: "说明",
    tipTokenFilled: "已填写 API Token：分享链接归属于你的账号，按套餐享受更长有效期。",
    tipTokenGuest: "未填写 Token 时走游客模式：分享链接仅保留 24 小时。",
    tipTokenHowToPrefix: "如何获取 Token：打开 ",
    tipTokenHowToSuffix: " → 登录账号 → 复制 API Token → 粘贴到上方。",
    tipThemes: "仅「备忘录 / 波普艺术 / 线圈笔记本」支持多主题，其他模板为固定样式。",
    tipImages: "本地图片暂不自动上传，建议使用外链图或先上传到图床。",
    tipCommand: "命令面板搜索「分享当前笔记」即可分享当前笔记。",
    commandPublish: "分享当前笔记",
    commandDeleteShare: "删除当前笔记的分享",
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
    // delete share
    deleteConfirmTitle: "删除分享",
    deleteConfirmMsg: "确定要删除「{note}」的分享吗？删除后公开链接将无法访问。",
    deleteConfirmYes: "删除",
    deleteConfirmNo: "取消",
    deletingNotice: "正在删除分享…",
    deleteSuccess: "分享已删除。",
    deleteFailed: "删除失败：",
    noShareToDelete: "当前笔记尚未分享。",

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

  },
};

let currentLang: "en" | "zh" = "en";

/** 使用 Obsidian 官方 getLanguage() API 探测界面是否为中文 */
function detectObsidianIsZh(): boolean {
  return getLanguage().toLowerCase().startsWith("zh");
}

/**
 * 初始化 / 切换语言。
 * @param preference auto | en | zh
 */
export function initI18n(_app: App, preference: PluginLanguage = "auto"): void {
  if (preference === "en") {
    currentLang = "en";
    return;
  }
  if (preference === "zh") {
    currentLang = "zh";
    return;
  }
  // auto
  currentLang = detectObsidianIsZh() ? "zh" : "en";
}

export function getCurrentLang(): "en" | "zh" {
  return currentLang;
}

export function t(
  key: string,
  vars?: Record<string, string | number>,
): string {
  const langDict = dict[currentLang] as Record<string, string> | undefined;
  let str: string = langDict?.[key] ?? (dict.en as Record<string, string>)[key] ?? key;
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
