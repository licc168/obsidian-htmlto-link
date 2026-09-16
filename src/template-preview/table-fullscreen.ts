import { t } from "../i18n";

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const FIT_PADDING = 32;

interface Point {
	x: number;
	y: number;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function isTableElement(node: Node): node is HTMLTableElement {
	return node.nodeName.toLowerCase() === "table";
}

export function wrapTablesForFullscreen(root: HTMLElement): void {
	for (const wrapper of Array.from(
		root.querySelectorAll<HTMLElement>(".markdown-table-wrapper, .table-wrapper"),
	)) {
		if (wrapper.querySelector(":scope > .htmlto-link-table-zoom-btn")) continue;
		if (!wrapper.querySelector("table")) continue;
		wrapper.addClass("markdown-table-wrapper");

		const button = wrapper.createEl("button", {
			cls: "htmlto-link-table-zoom-btn",
			attr: {
				type: "button",
				title: t("previewTableFullscreen"),
				"aria-label": t("previewTableFullscreen"),
			},
		});
		const icon = button.createSvg("svg", {
			attr: {
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				"stroke-width": "2",
				"stroke-linecap": "round",
				"stroke-linejoin": "round",
				"aria-hidden": "true",
			},
		});
		icon.createSvg("path", { attr: { d: "M8 3H5a2 2 0 0 0-2 2v3" } });
		icon.createSvg("path", { attr: { d: "M21 8V5a2 2 0 0 0-2-2h-3" } });
		icon.createSvg("path", { attr: { d: "M3 16v3a2 2 0 0 0 2 2h3" } });
		icon.createSvg("path", { attr: { d: "M16 21h3a2 2 0 0 0 2-2v-3" } });
		button.createSpan({ text: t("previewTableFullscreen") });
	}
}

export function bindTableFullscreenButtons(
	previewDocument: Document,
	onOpen: (table: HTMLTableElement, opener: HTMLElement) => void,
): void {
	for (const button of Array.from(
		previewDocument.querySelectorAll<HTMLButtonElement>(".htmlto-link-table-zoom-btn"),
	)) {
		if (button.dataset.htmltoLinkTableBound) continue;
		button.dataset.htmltoLinkTableBound = "true";
		button.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			const wrapper = button.closest(".markdown-table-wrapper, .table-wrapper");
			const table = wrapper?.querySelector("table");
			if (table && isTableElement(table)) onOpen(table, button);
		});
	}
}

export class TableFullscreenViewer {
	private overlay: HTMLElement | null = null;
	private canvas: HTMLElement | null = null;
	private stage: HTMLElement | null = null;
	private contentHost: HTMLElement | null = null;
	private zoomLabel: HTMLButtonElement | null = null;
	private scale = 1;
	private panX = 0;
	private panY = 0;
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

	open(table: HTMLTableElement, opener?: HTMLElement): void {
		this.ensure();
		const overlay = this.overlay;
		const contentHost = this.contentHost;
		if (!overlay || !contentHost) return;

		this.opener = opener ?? null;
		contentHost.empty();
		const imported = this.host.ownerDocument.importNode(table, true);
		if (!isTableElement(imported)) return;
		contentHost.appendChild(imported);

		overlay.addClass("is-active");
		document.body.addClass("htmlto-link-table-fs-open");
		this.overlay?.querySelector<HTMLButtonElement>(".htmlto-link-table-fs-close")?.focus();
		window.requestAnimationFrame(() => {
			this.resetReadable();
			window.requestAnimationFrame(() => this.resetReadable());
		});
	}

	close(): void {
		this.overlay?.removeClass("is-active");
		document.body.removeClass("htmlto-link-table-fs-open");
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
		if (this.resizeHandler) {
			window.removeEventListener("resize", this.resizeHandler);
			this.resizeHandler = null;
		}
		this.overlay?.remove();
		this.overlay = null;
		this.canvas = null;
		this.stage = null;
		this.contentHost = null;
		this.zoomLabel = null;
	}

	private ensure(): void {
		if (this.overlay) return;

		const overlay = this.host.createDiv({
			cls: "htmlto-link-table-fs",
			attr: {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": t("previewTableDialog"),
			},
		});
		const toolbar = overlay.createDiv({ cls: "htmlto-link-table-fs-toolbar" });
		const zoomOut = toolbar.createEl("button", {
			cls: "htmlto-link-table-fs-btn",
			text: "-",
			attr: {
				type: "button",
				title: t("previewMermaidZoomOut"),
				"aria-label": t("previewMermaidZoomOut"),
			},
		});
		const zoomLabel = toolbar.createEl("button", {
			cls: "htmlto-link-table-fs-btn htmlto-link-table-fs-zoom-label",
			text: t("previewTableReset"),
			attr: {
				type: "button",
				title: t("previewTableResetAria"),
				"aria-label": t("previewTableResetAria"),
			},
		});
		const zoomIn = toolbar.createEl("button", {
			cls: "htmlto-link-table-fs-btn",
			text: "+",
			attr: {
				type: "button",
				title: t("previewMermaidZoomIn"),
				"aria-label": t("previewMermaidZoomIn"),
			},
		});
		const closeBtn = toolbar.createEl("button", {
			cls: "htmlto-link-table-fs-btn htmlto-link-table-fs-close",
			text: "X",
			attr: {
				type: "button",
				title: t("previewMermaidClose"),
				"aria-label": t("previewMermaidClose"),
			},
		});

		const canvas = overlay.createDiv({ cls: "htmlto-link-table-fs-canvas" });
		const stage = canvas.createDiv({ cls: "htmlto-link-table-fs-stage" });
		const contentHost = stage.createDiv({ cls: "htmlto-link-table-fs-content" });
		overlay.createDiv({
			cls: "htmlto-link-table-fs-hint",
			text: t("previewMermaidHint"),
		});

		zoomOut.addEventListener("click", () => this.centerZoom(1 / 1.25));
		zoomIn.addEventListener("click", () => this.centerZoom(1.25));
		zoomLabel.addEventListener("click", () => this.resetReadable());
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
			this.resetReadable();
		});

		this.keyHandler = (event: KeyboardEvent) => this.onKeyDown(event);
		document.addEventListener("keydown", this.keyHandler);
		this.resizeHandler = () => {
			if (!this.isOpen()) return;
			if (Math.abs(this.scale - 1) < 0.02) this.resetReadable();
		};
		window.addEventListener("resize", this.resizeHandler);

		this.overlay = overlay;
		this.canvas = canvas;
		this.stage = stage;
		this.contentHost = contentHost;
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

	private layoutToCanvas(): void {
		const canvas = this.canvas;
		const box = this.contentHost;
		if (!canvas || !box) return;
		const rect = canvas.getBoundingClientRect();
		const width = Math.max(Math.floor(rect.width - FIT_PADDING * 2), 320);
		box.style.width = `${width}px`;
		box.style.maxWidth = `${width}px`;
	}

	private resetReadable(): void {
		this.layoutToCanvas();
		this.scale = 1;
		this.panX = FIT_PADDING;
		this.panY = FIT_PADDING;
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
			this.resetReadable();
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
