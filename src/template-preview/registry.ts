import {
	getTemplateThemes,
	resolveThemeClassForTemplate,
} from "../constants";

export interface PreviewTemplateTheme {
	value: string;
	labelKey: string;
}

export interface PreviewTemplateMeta {
	/** CSS class used by the published static renderer. */
	cardClass: string;
	extraClasses?: string[];
}

/**
 * Keep this map aligned with html2url/lib/static-markdown-share.ts.
 * purpleticket also keeps the legacy class because its stylesheet uses it.
 */
export const PREVIEW_TEMPLATE_META: Record<string, PreviewTemplateMeta> = {
	memo: { cardClass: "card-memo" },
	popart: { cardClass: "card-popart" },
	traditionalchinese: { cardClass: "card-traditionalchinese" },
	coilnotebook: {
		cardClass: "card-coilnotebook",
		extraClasses: ["is-long-content"],
	},
	purpleticket: {
		cardClass: "card-purpleticket",
		extraClasses: ["purple-ticket-template"],
	},
	bytedance: { cardClass: "card-bytedance" },
	warm: { cardClass: "card-warm" },
	alibaba: { cardClass: "card-alibaba" },
	notebook: { cardClass: "card-notebook" },
	darktech: { cardClass: "card-darktech" },
	fairytale: { cardClass: "card-fairytale" },
	boardgamestyle: { cardClass: "card-boardgame" },
	cyberpunk: { cardClass: "card-cyberpunk" },
	glassmorphism: { cardClass: "card-glassmorphism" },
	neonglow: { cardClass: "card-neonglow" },
	vintagenewspaper: { cardClass: "card-vintagenewspaper" },
	handwrittennote: { cardClass: "card-handwrittennote" },
	vintagemap: { cardClass: "card-vintagemap" },
	blueprint: { cardClass: "card-blueprint" },
	botanical: { cardClass: "card-botanical" },
	sketch: { cardClass: "card-sketch" },
	terminal: { cardClass: "card-terminal" },
	retro: { cardClass: "card-retro" },
	ayulight: { cardClass: "card-ayulight" },
	bauhaus: { cardClass: "card-bauhaus" },
	greensimple: { cardClass: "card-greensimple" },
	maximalism: { cardClass: "card-maximalism" },
	neobrutalism: { cardClass: "card-neobrutalism" },
	newsprint: { cardClass: "card-newsprint" },
	organic: { cardClass: "card-organic" },
	playfulgeometric: { cardClass: "card-playfulgeometric" },
	professional: { cardClass: "card-professional" },
	plain: { cardClass: "card-plain" },
};

export function getPreviewTemplateMeta(templateId: string): PreviewTemplateMeta {
	return PREVIEW_TEMPLATE_META[templateId] ?? PREVIEW_TEMPLATE_META.plain;
}

export function getPreviewThemes(templateId: string): PreviewTemplateTheme[] {
	return getTemplateThemes(templateId);
}

export function getPreviewThemeClass(
	templateId: string,
	themeClass?: string,
): string {
	return resolveThemeClassForTemplate(templateId, themeClass);
}
