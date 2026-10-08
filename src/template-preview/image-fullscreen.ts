import { t } from "../i18n";

const MIN_SCALE = 0.1;
const MAX_SCALE = 6;
const FIT_PADDING = 32;
const MIN_ICON_SIZE = 48;

interface Point {
	x: number;
	y: number;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function isContentImage(image: HTMLImageElement): boolean {
	const src = (image.getAttribute("src") ?? "").trim();
	if (!src) return false;
	if (image.closest("button, .htmlto-link-mermaid-wrapper, .htmlto-link-image-zoom-btn")) {
		return false;
	}
	const width = Number.parseFloat(image.getAttribute("width") ?? "");
	const height = Number.parseFloat(image.getAttribute("height") ?? "");
	return !(width > 0 && width < MIN_ICON_SIZE && height > 0 && height < MIN_ICON_SIZE);
}

export function wrapPreviewImages(html: string): string {
	const parsed = new DOMParser().parseFromString(
		`<div data-image-root="true">${html}</div>`,
		"text/html",
	);
	const root = parsed.body.firstElementChild as HTMLElement | null;
	if (!root) return html;
	wrapImagesForFullscreen(root);
	return root.innerHTML;
}

export function wrapImagesForFullscreen(root: HTMLElement): void {
	for (const image of Array.from(root.querySelectorAll<HTMLImageElement>("img"))) {
		if (!isContentImage(image)) continue;
		if (image.closest(".htmlto-link-image-frame")) continue;

		const frame = root.createSpan({ cls: "htmlto-link-image-frame" });
		image.replaceWith(frame);
		image.draggable = false;
		frame.appendChild(image);

		const button = frame.createEl("button", {
			cls: "htmlto-link-image-zoom-btn",
			attr: {
				type: "button",
				title: t("previewImageFullscreen"),
				"aria-label": t("previewImageFullscreen"),
			},
		});
		const icon = button.createSvg("svg", {
			attr: {
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				"stroke-width": "2.5",
				"stroke-linecap": "round",
				"aria-hidden": "true",
			},
		});
		icon.createSvg("path", { attr: { d: "M12 5v14M5 12h14" } });
	}
}

export function bindImageFullscreenButtons(
	previewDocument: Document,
	onOpen: (image: HTMLImageElement, opener: HTMLElement) => void,
): void {
	for (const button of Array.from(
		previewDocument.querySelectorAll<HTMLButtonElement>(".htmlto-link-image-zoom-btn"),
	)) {
		if (button.dataset.htmltoLinkImageBound) continue;
		button.dataset.htmltoLinkImageBound = "true";
		const frame = button.closest(".htmlto-link-image-frame");
		const image = frame?.querySelector("img");
		if (!image || image.tagName !== "IMG") continue;

		button.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			onOpen(image, button);
		});

		if (image.closest("a")) continue;
		image.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			onOpen(image, button);
		});
	}
}

export class ImageFullscreenViewer {
	private overlay: HTMLElement | null = null;
	private canvas: HTMLElement | null = null;
	private stage: HTMLElement | null = null;
	private imageEl: HTMLImageElement | null = null;
	private zoomLabel: HTMLButtonElement | null = null;
	private scale = 1;
	private panX = 0;
	private panY = 0;
	private nativeWidth = 1;
	private nativeHeight = 1;
	private userAdjusted = false;
	private dragging = false;
	private lastX = 0;
	private lastY = 0;
	private pinch = 0;
	private readonly pointers = new Map<number, Point>();
	private opener: HTMLElement | null = null;
	private keyHandler: ((event: KeyboardEvent) => void) | null = null;
	private wheelHandler: ((event: WheelEvent) => void) | null = null;
	private resizeHandler: (() => void) | null = null;

	constructor(private readonly host: HTMLElement) {}

	open(image: HTMLImageElement, opener?: HTMLElement): void {
		this.ensure();
		const overlay = this.overlay;
		const stage = this.stage;
		if (!overlay || !stage) return;

		const src = image.currentSrc || image.getAttribute("src") || "";
		if (!src) return;

		this.opener = opener ?? null;
		this.userAdjusted = false;
		stage.empty();
		const viewed = stage.createEl("img", {
			attr: {
				src,
				alt: image.alt || t("previewImageDialog"),
				draggable: "false",
			},
		});
		viewed.draggable = false;
		const fitWhenReady = () => {
			this.readSize(viewed);
			if (!this.userAdjusted) this.fit();
		};
		viewed.addEventListener("load", fitWhenReady);
		this.imageEl = viewed;
		if (viewed.complete) fitWhenReady();

		overlay.addClass("is-active");
		document.body.addClass("htmlto-link-image-fs-open");
		overlay.querySelector<HTMLButtonElement>(".htmlto-link-image-fs-close")?.focus();
		window.requestAnimationFrame(() => {
			if (!this.userAdjusted) this.fit();
			window.requestAnimationFrame(() => {
				if (!this.userAdjusted) this.fit();
			});
		});
	}

	close(): void {
		this.overlay?.removeClass("is-active");
		document.body.removeClass("htmlto-link-image-fs-open");
		this.pointers.clear();
		this.dragging = false;
		this.canvas?.removeClass("is-dragging");
		this.stage?.empty();
		this.imageEl = null;
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
		if (this.resizeHandler) {
			window.removeEventListener("resize", this.resizeHandler);
			this.resizeHandler = null;
		}
		this.overlay?.remove();
		this.overlay = null;
		this.canvas = null;
		this.stage = null;
		this.imageEl = null;
		this.zoomLabel = null;
	}

	private ensure(): void {
		if (this.overlay) return;

		const overlay = this.host.createDiv({
			cls: "htmlto-link-image-fs",
			attr: {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": t("previewImageDialog"),
			},
		});
		const toolbar = overlay.createDiv({ cls: "htmlto-link-image-fs-toolbar" });
		const zoomOut = toolbar.createEl("button", {
			cls: "htmlto-link-image-fs-btn",
			text: "-",
			attr: {
				type: "button",
				title: t("previewMermaidZoomOut"),
				"aria-label": t("previewMermaidZoomOut"),
			},
		});
		const zoomLabel = toolbar.createEl("button", {
			cls: "htmlto-link-image-fs-btn htmlto-link-image-fs-zoom-label",
			text: t("previewMermaidFit"),
			attr: {
				type: "button",
				title: t("previewMermaidFit"),
				"aria-label": t("previewMermaidFit"),
			},
		});
		const zoomIn = toolbar.createEl("button", {
			cls: "htmlto-link-image-fs-btn",
			text: "+",
			attr: {
				type: "button",
				title: t("previewMermaidZoomIn"),
				"aria-label": t("previewMermaidZoomIn"),
			},
		});
		const closeBtn = toolbar.createEl("button", {
			cls: "htmlto-link-image-fs-btn htmlto-link-image-fs-close",
			text: "X",
			attr: {
				type: "button",
				title: t("previewMermaidClose"),
				"aria-label": t("previewMermaidClose"),
			},
		});

		const canvas = overlay.createDiv({ cls: "htmlto-link-image-fs-canvas" });
		const stage = canvas.createDiv({ cls: "htmlto-link-image-fs-stage" });
		overlay.createDiv({
			cls: "htmlto-link-image-fs-hint",
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
		this.resizeHandler = () => {
			if (!this.isOpen() || this.userAdjusted) return;
			this.fit();
		};
		window.addEventListener("resize", this.resizeHandler);

		this.overlay = overlay;
		this.canvas = canvas;
		this.stage = stage;
		this.zoomLabel = zoomLabel;
	}

	private isOpen(): boolean {
		return Boolean(this.overlay?.hasClass("is-active"));
	}

	private readSize(image: HTMLImageElement): void {
		const width = image.naturalWidth || image.width;
		const height = image.naturalHeight || image.height;
		if (width > 1 && height > 1) {
			this.nativeWidth = width;
			this.nativeHeight = height;
			image.style.width = `${width}px`;
			image.style.height = `${height}px`;
		}
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
		if (this.imageEl) this.readSize(this.imageEl);
		const rect = canvas.getBoundingClientRect();
		const availableWidth = Math.max(rect.width - FIT_PADDING * 2, 50);
		const availableHeight = Math.max(rect.height - FIT_PADDING * 2, 50);
		let next = Math.min(
			availableWidth / this.nativeWidth,
			availableHeight / this.nativeHeight,
		);
		if (!Number.isFinite(next) || next <= 0) next = 1;
		this.userAdjusted = false;
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
		this.userAdjusted = true;
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
		if (event.button !== 0 && event.pointerType === "mouse") return;
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
