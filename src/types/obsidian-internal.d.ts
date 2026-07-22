import "obsidian";

/**
 * Obsidian 内部设置 API 类型声明。
 * 这些 API 不在官方 obsidian.d.ts 中导出，但运行时可用。
 */
declare module "obsidian" {
	interface App {
		setting: {
			open(): void;
			openTabById(id: string): void;
		};
	}
}
