import { TFile, type TAbstractFile } from "obsidian";
import type { HtmltoLinkSettings } from "./constants";

interface ShareIndexHost {
	settings: HtmltoLinkSettings;
	saveSettings(): Promise<void>;
}

/**
 * 分享记录、图片缓存都按 vault 路径当 key。
 * 笔记改名或移动文件夹时，把旧路径迁到新路径，避免再次分享变成新链接。
 */
export function remapPathKeys<T>(
	map: Record<string, T>,
	oldPath: string,
	newPath: string,
): boolean {
	if (!map || oldPath === newPath) return false;

	let changed = false;

	if (Object.prototype.hasOwnProperty.call(map, oldPath)) {
		map[newPath] = map[oldPath];
		delete map[oldPath];
		changed = true;
	}

	const oldPrefix = oldPath.endsWith("/") ? oldPath : `${oldPath}/`;
	const newPrefix = newPath.endsWith("/") ? newPath : `${newPath}/`;
	for (const key of Object.keys(map)) {
		if (!key.startsWith(oldPrefix)) continue;
		map[newPrefix + key.slice(oldPrefix.length)] = map[key];
		delete map[key];
		changed = true;
	}

	return changed;
}

export async function handleVaultRename(
	plugin: ShareIndexHost,
	file: TAbstractFile,
	oldPath: string,
): Promise<void> {
	const newPath = file.path;
	const sharesChanged = remapPathKeys(plugin.settings.noteShares, oldPath, newPath);
	const assetsChanged = remapPathKeys(plugin.settings.uploadedAssets, oldPath, newPath);
	if (sharesChanged || assetsChanged) {
		await plugin.saveSettings();
	}
}

export async function handleVaultDelete(
	plugin: ShareIndexHost,
	file: TAbstractFile,
): Promise<void> {
	let changed = false;

	if (plugin.settings.noteShares?.[file.path]) {
		delete plugin.settings.noteShares[file.path];
		changed = true;
	}
	if (plugin.settings.uploadedAssets?.[file.path]) {
		delete plugin.settings.uploadedAssets[file.path];
		changed = true;
	}

	if (!(file instanceof TFile)) {
		const prefix = file.path.endsWith("/") ? file.path : `${file.path}/`;
		for (const key of Object.keys(plugin.settings.noteShares || {})) {
			if (key.startsWith(prefix)) {
				delete plugin.settings.noteShares[key];
				changed = true;
			}
		}
		for (const key of Object.keys(plugin.settings.uploadedAssets || {})) {
			if (key.startsWith(prefix)) {
				delete plugin.settings.uploadedAssets[key];
				changed = true;
			}
		}
	}

	if (changed) await plugin.saveSettings();
}
