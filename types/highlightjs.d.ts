export interface HighlightResult {
	value: string;
	language?: string;
}

export interface HighlightJs {
	getLanguage(name: string): object | undefined;
	highlight(
		code: string,
		options: {
			language: string;
			ignoreIllegals?: boolean;
		},
	): HighlightResult;
	highlightAuto(code: string): HighlightResult;
}

declare const hljs: HighlightJs;
export default hljs;
