/** Idle delay after a save before updating the public share. */
export const AUTO_UPDATE_DEBOUNCE_MS = 2000;

export type AutoUpdateFailureAction = "drop" | "pause" | "retry";

export type Clock = {
	setTimeout: (fn: () => void | Promise<void>, ms: number) => number;
	clearTimeout: (id: number) => void;
};

/**
 * Stable, non-crypto fingerprint of prepared markdown.
 * Used to skip no-op saves (including frontmatter-only writes).
 */
export function fingerprintMarkdown(markdown: string): string {
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;
	for (let i = 0; i < markdown.length; i++) {
		const ch = markdown.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
	return combined.toString(16);
}

export function shouldScheduleAutoUpdate(
	enabled: boolean,
	extension: string,
	hasShare: boolean,
	paused: boolean,
): boolean {
	return enabled && extension === "md" && hasShare && !paused;
}

export function shouldSkipUnchanged(
	contentHash: string | undefined,
	markdown: string,
): boolean {
	if (!markdown) return true;
	if (!contentHash) return false;
	return contentHash === fingerprintMarkdown(markdown);
}

/**
 * Auto-update must never mint a new URL.
 * 404 → drop the local share record (page is gone).
 * Other 4xx → pause until the user shares again.
 * Network / 429 → retry on the next save.
 */
export function autoUpdateFailureAction(
	status: number | undefined,
	isNetwork: boolean,
): AutoUpdateFailureAction {
	if (isNetwork) return "retry";
	if (status === 404) return "drop";
	if (status === 429) return "retry";
	if (status !== undefined && status >= 400) return "pause";
	return "retry";
}

/** Serialize tasks that touch the same vault path (manual share vs auto-update). */
export class PathMutex {
	private readonly tails = new Map<string, Promise<void>>();

	run<T>(path: string, task: () => Promise<T>): Promise<T> {
		const prev = this.tails.get(path);
		const current = prev ? prev.then(task, () => task()) : task();
		this.tails.set(
			path,
			current.then(
				() => undefined,
				() => undefined,
			),
		);
		return current;
	}
}

/** Coalesce rapid saves per path; queue another run if one is already in flight. */
export class DebouncedPathScheduler {
	private readonly timers = new Map<string, number>();
	private readonly inFlight = new Set<string>();
	private readonly queued = new Set<string>();

	constructor(
		private readonly delayMs: number,
		private readonly run: (path: string) => Promise<void>,
		private readonly clock: Clock,
	) {}

	schedule(path: string): void {
		const existing = this.timers.get(path);
		if (existing != null) this.clock.clearTimeout(existing);
		const id = this.clock.setTimeout(() => {
			this.timers.delete(path);
			return this.flush(path);
		}, this.delayMs);
		this.timers.set(path, id);
	}

	cancel(path: string): void {
		const existing = this.timers.get(path);
		if (existing != null) {
			this.clock.clearTimeout(existing);
			this.timers.delete(path);
		}
		this.queued.delete(path);
	}

	destroy(): void {
		for (const id of this.timers.values()) this.clock.clearTimeout(id);
		this.timers.clear();
		this.queued.clear();
	}

	private async flush(path: string): Promise<void> {
		if (this.inFlight.has(path)) {
			this.queued.add(path);
			return;
		}
		this.inFlight.add(path);
		try {
			await this.run(path);
		} finally {
			this.inFlight.delete(path);
			if (this.queued.has(path)) {
				this.queued.delete(path);
				this.schedule(path);
			}
		}
	}
}
