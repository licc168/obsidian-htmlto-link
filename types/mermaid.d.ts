export interface Mermaid {
	initialize(config: {
		startOnLoad?: boolean;
		suppressErrorRendering?: boolean;
		securityLevel?: string;
		theme?: string;
		fontFamily?: string;
		flowchart?: {
			htmlLabels?: boolean;
			useMaxWidth?: boolean;
			wrappingWidth?: number;
		};
	}): void;
	render(id: string, definition: string): Promise<string | { svg: string }>;
}

declare const mermaid: Mermaid;
export default mermaid;
