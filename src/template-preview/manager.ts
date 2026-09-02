import { MarkdownView, TFile } from "obsidian";
import type HtmltoLinkPlugin from "../main";
import { canMountTemplatePreview, TemplatePreviewController } from "./controller";

export class TemplatePreviewManager {
	private readonly controllers = new Map<MarkdownView, TemplatePreviewController>();

	constructor(private readonly plugin: HtmltoLinkPlugin) {}

	sync(): void {
		const liveViews = new Set<MarkdownView>();
		for (const leaf of this.plugin.app.workspace.getLeavesOfType("markdown")) {
			if (!(leaf.view instanceof MarkdownView) || !canMountTemplatePreview(leaf.view)) continue;
			const view = leaf.view;
			liveViews.add(view);
			const controller = this.controllers.get(view);
			if (controller) {
				controller.handleViewFileChange();
			} else {
				this.controllers.set(view, new TemplatePreviewController(this.plugin, view));
			}
		}

		for (const [view, controller] of this.controllers) {
			if (!liveViews.has(view)) {
				controller.destroy();
				this.controllers.delete(view);
			}
		}
	}

	onEditorChange(info: MarkdownView): void {
		this.controllers.get(info)?.handleEditorChange(info);
	}

	onFileChange(file: TFile): void {
		for (const controller of this.controllers.values()) controller.handleFileChange(file);
	}

	focusActive(): void {
		const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;
		this.controllers.get(view)?.focusTemplate();
	}

	destroy(): void {
		for (const controller of this.controllers.values()) controller.destroy();
		this.controllers.clear();
	}
}
