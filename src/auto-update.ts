import { Notice, TFile, type App } from "obsidian";
import { ApiError, updateSharePage } from "./api";
import {
	AUTO_UPDATE_DEBOUNCE_MS,
	DebouncedPathScheduler,
	PathMutex,
	autoUpdateFailureAction,
	fingerprintMarkdown,
	shouldScheduleAutoUpdate,
	shouldSkipUnchanged,
} from "./auto-update-core";
import {
	resolveThemeClassForTemplate,
	type HtmltoLinkSettings,
	type NoteShareRecord,
} from "./constants";
import { t } from "./i18n";
import { rewriteLocalImagesForShare } from "./local-images";
import { prepareMarkdown } from "./publish";

interface AutoUpdateHost {
	settings: HtmltoLinkSettings;
	saveSettings(): Promise<void>;
	app: App;
}

export class AutoUpdateController {
	readonly mutex = new PathMutex();
	private readonly scheduler: DebouncedPathScheduler;

	constructor(private readonly plugin: AutoUpdateHost) {
		this.scheduler = new DebouncedPathScheduler(
			AUTO_UPDATE_DEBOUNCE_MS,
			(path) => this.mutex.run(path, () => autoUpdateSharedNote(this.plugin, path)),
			{
				setTimeout: (fn, ms) =>
					window.setTimeout(() => {
						void fn();
					}, ms),
				clearTimeout: (id) => window.clearTimeout(id),
			},
		);
	}

	onFileModify(file: TFile): void {
		const record = this.plugin.settings.noteShares?.[file.path];
		if (
			!shouldScheduleAutoUpdate(
				this.plugin.settings.autoUpdateOnSave,
				file.extension,
				Boolean(record),
				Boolean(record?.autoUpdatePaused),
			)
		) {
			return;
		}
		this.scheduler.schedule(file.path);
	}

	cancel(path: string): void {
		this.scheduler.cancel(path);
	}

	destroy(): void {
		this.scheduler.destroy();
	}
}

async function autoUpdateSharedNote(
	plugin: AutoUpdateHost,
	path: string,
): Promise<void> {
	if (!plugin.settings.autoUpdateOnSave) return;

	const file = plugin.app.vault.getAbstractFileByPath(path);
	if (!(file instanceof TFile) || file.extension !== "md") return;

	const record = plugin.settings.noteShares?.[path];
	if (!record || record.autoUpdatePaused) return;

	const markdown = prepareMarkdown(await plugin.app.vault.read(file));
	if (shouldSkipUnchanged(record.contentHash, markdown)) return;

	const templateId = record.templateId || plugin.settings.templateId;
	const themeClass = resolveThemeClassForTemplate(
		templateId,
		record.themeClass ?? plugin.settings.themeClass,
	);

	try {
		const imageResult = await rewriteLocalImagesForShare(
			plugin.app,
			plugin.settings,
			file,
			markdown,
		);
		if (imageResult.cacheUpdated) {
			await plugin.saveSettings();
		}
		if (imageResult.failed.length > 0) {
			new Notice(
				t("imageUploadPartialFail", {
					count: String(imageResult.failed.length),
				}),
				6000,
			);
		}

		const result = await updateSharePage(plugin.settings, {
			content: imageResult.markdown,
			title: file.basename,
			templateId,
			themeClass,
			slug: record.slug,
			updateToken: record.updateToken,
		});

		await saveShareRecord(plugin, path, {
			slug: result.slug || record.slug,
			updateToken: result.updateToken || record.updateToken,
			url: result.url || record.url,
			updatedAt: new Date().toISOString(),
			temporary: result.temporary,
			expiresAt: result.expiresAt,
			templateId,
			themeClass,
			contentHash: fingerprintMarkdown(markdown),
		});
		new Notice(t("autoUpdateSuccess"), 2000);
	} catch (err: unknown) {
		await handleAutoUpdateFailure(plugin, path, record, err);
	}
}

async function handleAutoUpdateFailure(
	plugin: AutoUpdateHost,
	path: string,
	record: NoteShareRecord,
	err: unknown,
): Promise<void> {
	const apiErr = err instanceof ApiError ? err : null;
	const action = autoUpdateFailureAction(apiErr?.status, Boolean(apiErr?.isNetwork));
	const message = err instanceof Error ? err.message : String(err);

	if (action === "drop") {
		if (plugin.settings.noteShares?.[path]) {
			delete plugin.settings.noteShares[path];
			await plugin.saveSettings();
		}
		new Notice(t("autoUpdateExpired"), 8000);
		return;
	}

	if (action === "pause") {
		await saveShareRecord(plugin, path, {
			...record,
			autoUpdatePaused: true,
		});
		new Notice(t("autoUpdatePaused") + message, 8000);
		return;
	}

	new Notice(t("autoUpdateFailed") + message, 8000);
}

async function saveShareRecord(
	plugin: AutoUpdateHost,
	path: string,
	record: NoteShareRecord,
): Promise<void> {
	if (!plugin.settings.noteShares) {
		plugin.settings.noteShares = {};
	}
	plugin.settings.noteShares[path] = record;
	await plugin.saveSettings();
}
