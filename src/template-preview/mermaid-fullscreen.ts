import { t } from "../i18n";

const MIN_SCALE = 0.1;
const MAX_SCALE = 6;
const FIT_PADDING = 32;

interface Size {
	w: number;
	h: number;
}

interface Point {
	x: number;
	y: number;
}

function viewBoxSize(svg: SVGElement): Size | null {
	const raw = svg.getAttribute("viewBox") ?? svg.getAttribute("viewbox") ?? "";
	const parts = raw
		.trim()
		.split(/[\s,]+/)
		.map((value) => Number.parseFloat(value));
	if (parts.length === 4 && parts[2] > 1 && parts[3] > 1) {
		return { w: parts[2], h: parts[3] };
	}
	return null;
}

function pixelAttribute(svg: SVGElement, name: string): number {
	const raw = svg.getAttribute(name) ?? "";
	if (!raw || raw.includes("%")) return 0;
	const value = Number.parseFloat(raw);
	return Number.isFinite(value) && value > 1 ? value : 0;
}

function svgSize(svg: SVGElement): Size {
	const viewBox = viewBoxSize(svg);
	if (viewBox) return viewBox;

	const width = pixelAttribute(svg, "width");
	const height = pixelAttribute(svg, "height");
	if (width > 1 && height > 1) return { w: width, h: height };

	const intrinsicWidth = Number.parseFloat(
		svg.getAttribute("data-htmlto-link-intrinsic-width") ?? "",
	);
	if (Number.isFinite(intrinsicWidth) && intrinsicWidth > 1 && height > 1) {
		return { w: intrinsicWidth, h: height };
	}

	return {
		w: Math.max(svg.clientWidth || svg.scrollWidth || 1, 1),
		h: Math.max(svg.clientHeight || svg.scrollHeight || 1, 1),
	};
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function prepareSvg(svg: SVGElement): Size {
	const size = svgSize(svg);
	svg.removeAttribute("style");
	svg.setAttribute("width", String(size.w));
	svg.setAttribute("height", String(size.h));
	svg.style.cssText =
		`max-width:none!important;max-height:none!important;width:${size.w}px;height:${size.h}px;display:block;`;
	return size;
}

function isSvgElement(node: Node): node is SVGElement {
	return node.nodeName.toLowerCase() === "svg";
}

function pickDiagramSvg(root: ParentNode): SVGElement | null {
	let best: SVGElement | null = null;
	let bestArea = 0;
	for (const node of Array.from(root.querySelectorAll("svg"))) {
		const size = svgSize(node);
		const area = size.w * size.h;
		if (area > bestArea && size.w > 32 && size.h > 32) {
			best = node;
			bestArea = area;
		}
	}
	return best ?? root.querySelector("svg");
}

export function wrapMermaidDiagrams(root: HTMLElement): void {
	for (const mermaidEl of Array.from(root.querySelectorAll<HTMLElement>(".mermaid"))) {
		if (mermaidEl.classList.contains("mermaid-error")) continue;
		if (mermaidEl.closest(".htmlto-link-mermaid-wrapper")) continue;
		if (!mermaidEl.querySelector("svg")) continue;

		const wrapper = root.createDiv({ cls: "htmlto-link-mermaid-wrapper" });
		mermaidEl.replaceWith(wrapper);
		wrapper.appendChild(mermaidEl);

		const button = wrapper.createEl("button", {
			cls: "htmlto-link-mermaid-zoom-btn",
			attr: {
				type: "button",
				title: t("previewMermaidFullscreen"),
				"aria-label": t("previewMermaidFullscreen"),
			},
		});
		button.createSpan({ text: t("previewMermaidFullscreen") });
	}
}

export function bindMermaidFullscreenButtons(
	previewDocument: Document,
	onOpen: (svg: SVGElement, opener: HTMLElement) => void,
): void {
	for (const button of Array.from(
		previewDocument.querySelectorAll<HTMLButtonElement>(".htmlto-link-mermaid-zoom-btn"),
	)) {
		if (button.dataset.htmltoLinkMermaidBound) continue;
		button.dataset.htmltoLinkMermaidBound = "true";
		button.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			const wrapper = button.closest(".htmlto-link-mermaid-wrapper");
			const mermaid = wrapper?.querySelector(".mermaid") ?? wrapper;
			if (!mermaid) return;
			const svg = pickDiagramSvg(mermaid);
			if (svg) onOpen(svg, button);
		});
	}
}

export class MermaidFullscreenViewer {
	private overlay: HTMLElement | null = null;
	private canvas: HTMLElement | null = null;
	private stage: HTMLElement | null = null;
	private svgHost: HTMLElement | null = null;
	private zoomLabel: HTMLButtonElement | null = null;
	private scale = 1;
	private panX = 0;
	private panY = 0;
	private nativeWidth = 1;
	private nativeHeight = 1;
	private dragging = false;
	private lastX = 0;
	private lastY = 0;
	private pinch = 0;
	private readonly pointers = new Map<number, Point>();
	private opener: HTMLElement | null = null;
	private keyHandler: ((event: KeyboardEvent) => void) | null = null;
	private wheelHandler: ((event: WheelEvent) => void) | null = null;

	constructor(private readonly host: HTMLElement) {}

	open(svg: SVGElement, opener?: HTMLElement): void {
		this.ensure();
		const overlay = this.overlay;
		const svgHost = this.svgHost;
		const stage = this.stage;
		if (!overlay || !svgHost || !stage) return;

		this.opener = opener ?? null;
		svgHost.empty();
		const imported = this.host.ownerDocument.importNode(svg, true);
		if (!isSvgElement(imported)) return;
		const size = prepareSvg(imported);
		this.nativeWidth = size.w;
		this.nativeHeight = size.h;
		svgHost.appendChild(imported);

		overlay.addClass("is-active");
		document.body.addClass("htmlto-link-mermaid-fs-open");
		this.zoomLabel?.focus();
		window.requestAnimationFrame(() => {
			prepareSvg(imported);
			this.fit();
			window.requestAnimationFrame(() => this.fit());
		});
	}

	close(): void {
		this.overlay?.removeClass("is-active");
		document.body.removeClass("htmlto-link-mermaid-fs-open");
		this.pointers.clear();
		this.dragging = false;
		this.canvas?.removeClass("is-dragging");
		if (this.opener && typeof this.opener.focus === "function") {
			try {
				this.opener.focus();
			} catch {
				// The preview iframe may already have been replaced.
			}
		}
		this.opener = null;
	}

	destroy(): void {
		this.close();
		if (this.keyHandler) {
			document.removeEventListener("keydown", this.keyHandler);
			this.keyHandler = null;
		}
		if (this.canvas && this.wheelHandler) {
			this.canvas.removeEventListener("wheel", this.wheelHandler);
			this.wheelHandler = null;
		}
		this.overlay?.remove();
		this.overlay = null;
		this.canvas = null;
		this.stage = null;
		this.svgHost = null;
		this.zoomLabel = null;
	}

	private ensure(): void {
		if (this.overlay) return;

		const overlay = this.host.createDiv({
			cls: "htmlto-link-mermaid-fs",
			attr: {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": t("previewMermaidDialog"),
			},
		});
		const toolbar = overlay.createDiv({ cls: "htmlto-link-mermaid-fs-toolbar" });
		const zoomOut = toolbar.createEl("button", {
			cls: "htmlto-link-mermaid-fs-btn",
			text: "-",
			attr: {
				type: "button",
				title: t("previewMermaidZoomOut"),
				"aria-label": t("previewMermaidZoomOut"),
			},
		});
		const zoomLabel = toolbar.createEl("button", {
			cls: "htmlto-link-mermaid-fs-btn htmlto-link-mermaid-fs-zoom-label",
			text: t("previewMermaidFit"),
			attr: {
				type: "button",
				title: t("previewMermaidFit"),
				"aria-label": t("previewMermaidFit"),
			},
		});
		const zoomIn = toolbar.createEl("button", {
			cls: "htmlto-link-mermaid-fs-btn",
			text: "+",
			attr: {
				type: "button",
				title: t("previewMermaidZoomIn"),
				"aria-label": t("previewMermaidZoomIn"),
			},
		});
		const closeBtn = toolbar.createEl("button", {
			cls: "htmlto-link-mermaid-fs-btn",
			text: "X",
			attr: {
				type: "button",
				title: t("previewMermaidClose"),
				"aria-label": t("previewMermaidClose"),
			},
		});

		const canvas = overlay.createDiv({ cls: "htmlto-link-mermaid-fs-canvas" });
		const stage = canvas.createDiv({ cls: "htmlto-link-mermaid-fs-stage" });
		const svgHost = stage.createDiv({ cls: "htmlto-link-mermaid-fs-svg" });
		overlay.createDiv({
			cls: "htmlto-link-mermaid-fs-hint",
			text: t("previewMermaidHint"),
		});

		zoomOut.addEventListener("click", () => this.centerZoom(1 / 1.25));
		zoomIn.addEventListener("click", () => this.centerZoom(1.25));
		zoomLabel.addEventListener("click", () => this.fit());
		closeBtn.addEventListener("click", () => this.close());

		this.wheelHandler = (event: WheelEvent) => {
			if (!this.isOpen()) return;
			event.preventDefault();
			this.zoomAt(event.clientX, event.clientY, this.scale * (event.deltaY > 0 ? 1 / 1.1 : 1.1));
		};
		canvas.addEventListener("wheel", this.wheelHandler, { passive: false });
		canvas.addEventListener("pointerdown", (event) => this.onPointerDown(event));
		canvas.addEventListener("pointermove", (event) => this.onPointerMove(event));
		canvas.addEventListener("pointerup", (event) => this.onPointerUp(event));
		canvas.addEventListener("pointercancel", (event) => this.onPointerUp(event));
		canvas.addEventListener("dblclick", (event) => {
			event.preventDefault();
			this.fit();
		});

		this.keyHandler = (event: KeyboardEvent) => this.onKeyDown(event);
		document.addEventListener("keydown", this.keyHandler);

		this.overlay = overlay;
		this.canvas = canvas;
		this.stage = stage;
		this.svgHost = svgHost;
		this.zoomLabel = zoomLabel;
	}

	private isOpen(): boolean {
		return Boolean(this.overlay?.hasClass("is-active"));
	}

	private apply(): void {
		if (this.stage) {
			this.stage.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
		}
		if (this.zoomLabel) {
			this.zoomLabel.setText(`${Math.round(this.scale * 100)}%`);
		}
	}

	private fit(): void {
		const canvas = this.canvas;
		if (!canvas) return;
		const svg = this.svgHost?.querySelector("svg");
		if (svg) {
			const size = prepareSvg(svg);
			this.nativeWidth = size.w;
			this.nativeHeight = size.h;
		}
		const rect = canvas.getBoundingClientRect();
		const availableWidth = Math.max(rect.width - FIT_PADDING * 2, 50);
		const availableHeight = Math.max(rect.height - FIT_PADDING * 2, 50);
		let next = Math.min(availableWidth / this.nativeWidth, availableHeight / this.nativeHeight);
		if (!Number.isFinite(next) || next <= 0) next = 1;
		this.scale = clamp(next, MIN_SCALE, 1);
		this.panX = (rect.width - this.nativeWidth * this.scale) / 2;
		this.panY = (rect.height - this.nativeHeight * this.scale) / 2;
		this.apply();
	}

	private zoomAt(clientX: number, clientY: number, nextScale: number): void {
		const canvas = this.canvas;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const pointX = clientX - rect.left;
		const pointY = clientY - rect.top;
		const worldX = (pointX - this.panX) / this.scale;
		const worldY = (pointY - this.panY) / this.scale;
		this.scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
		this.panX = pointX - worldX * this.scale;
		this.panY = pointY - worldY * this.scale;
		this.apply();
	}

	private centerZoom(factor: number): void {
		const canvas = this.canvas;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		this.zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, this.scale * factor);
	}

	private onPointerDown(event: PointerEvent): void {
		if (!this.canvas) return;
		this.canvas.setPointerCapture(event.pointerId);
		this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (this.pointers.size === 1) {
			this.dragging = true;
			this.lastX = event.clientX;
			this.lastY = event.clientY;
			this.canvas.addClass("is-dragging");
		} else if (this.pointers.size === 2) {
			this.dragging = false;
			const points = Array.from(this.pointers.values());
			const first = points[0];
			const second = points[1];
			if (first && second) {
				this.pinch = Math.hypot(first.x - second.x, first.y - second.y);
			}
		}
	}

	private onPointerMove(event: PointerEvent): void {
		if (!this.pointers.has(event.pointerId)) return;
		this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (this.pointers.size === 2 && this.pinch) {
			const points = Array.from(this.pointers.values());
			const first = points[0];
			const second = points[1];
			if (!first || !second) return;
			const distance = Math.hypot(first.x - second.x, first.y - second.y);
			this.zoomAt(
				(first.x + second.x) / 2,
				(first.y + second.y) / 2,
				this.scale * (distance / this.pinch),
			);
			this.pinch = distance || this.pinch;
			return;
		}
		if (this.dragging) {
			this.panX += event.clientX - this.lastX;
			this.panY += event.clientY - this.lastY;
			this.lastX = event.clientX;
			this.lastY = event.clientY;
			this.apply();
		}
	}

	private onPointerUp(event: PointerEvent): void {
		this.pointers.delete(event.pointerId);
		if (this.pointers.size < 2) this.pinch = 0;
		if (this.pointers.size === 0) {
			this.dragging = false;
			this.canvas?.removeClass("is-dragging");
		}
	}

	private onKeyDown(event: KeyboardEvent): void {
		if (!this.isOpen()) return;
		if (event.key === "Escape") {
			event.preventDefault();
			this.close();
			return;
		}
		if (event.key === "+" || event.key === "=") {
			event.preventDefault();
			this.centerZoom(1.25);
			return;
		}
		if (event.key === "-" || event.key === "_") {
			event.preventDefault();
			this.centerZoom(1 / 1.25);
			return;
		}
		if (event.key === "0") {
			event.preventDefault();
			this.fit();
			return;
		}
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			this.panX += 48;
			this.apply();
			return;
		}
		if (event.key === "ArrowRight") {
			event.preventDefault();
			this.panX -= 48;
			this.apply();
			return;
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			this.panY += 48;
			this.apply();
			return;
		}
		if (event.key === "ArrowDown") {
			event.preventDefault();
			this.panY -= 48;
			this.apply();
			return;
		}
		if (event.key === "Tab" && this.overlay) {
			const buttons = Array.from(this.overlay.querySelectorAll("button"));
			if (buttons.length === 0) return;
			const first = buttons[0];
			const last = buttons[buttons.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		}
	}
}
