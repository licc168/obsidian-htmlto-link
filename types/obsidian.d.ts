export interface PluginManifest {
	id: string;
	name: string;
	version: string;
}

export interface EventRef {
	e: unknown;
}

export interface RequestUrlParam {
	url: string;
	method?: string;
	headers?: Record<string, string>;
	body?: string | ArrayBuffer;
	throw?: boolean;
}

export interface RequestUrlResponse {
	status: number;
	text: string;
}

export interface Command {
	id: string;
	name: string;
	callback?: () => void;
	checkCallback?: (checking: boolean) => boolean;
}

export interface SettingDefinition {
	name?: string;
	desc?: string | DocumentFragment;
	searchable?: boolean;
	visible?: () => boolean;
	render?: (setting: Setting) => void;
}

export type SettingDefinitionItem =
	| SettingDefinition
	| {
			type: "group";
			heading: string;
			items: SettingDefinition[];
	  };

export class Component {
	load(): void;
	unload(): void;
}

export class TAbstractFile {
	path: string;
	name: string;
}

export class TFile extends TAbstractFile {
	basename: string;
	extension: string;
	stat: {
		mtime: number;
		size: number;
	};
}

export class Editor {
	getValue(): string;
}

export class View {
	containerEl: HTMLElement;
}

export class MarkdownView extends View {
	file: TFile | null;
	editor: Editor;
}

export class WorkspaceLeaf {
	view: View;
}

export class MenuItem {
	setTitle(title: string): this;
	setIcon(icon: string): this;
	onClick(callback: () => void): this;
}

export class Menu {
	addItem(cb: (item: MenuItem) => void): this;
}

export class Vault {
	read(file: TFile): Promise<string>;
	readBinary(file: TFile): Promise<ArrayBuffer>;
	getAbstractFileByPath(path: string): TAbstractFile | null;
	on(name: "modify", callback: (file: TAbstractFile) => void): EventRef;
	on(name: "rename", callback: (file: TAbstractFile, oldPath: string) => void): EventRef;
	on(name: "delete", callback: (file: TAbstractFile) => void): EventRef;
}

export class Workspace {
	getActiveViewOfType<T>(type: new (...args: never[]) => T): T | null;
	getLeavesOfType(viewType: string): WorkspaceLeaf[];
	onLayoutReady(callback: () => void): void;
	on(name: "layout-change", callback: () => void): EventRef;
	on(name: "file-open", callback: (file: TFile | null) => void): EventRef;
	on(name: "editor-change", callback: (editor: Editor, info: MarkdownView) => void): EventRef;
	on(name: "file-menu", callback: (menu: Menu, file: TAbstractFile) => void): EventRef;
}

export class MetadataCache {
	getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null;
}

export class FileManager {
	processFrontMatter(
		file: TFile,
		fn: (frontmatter: Record<string, unknown>) => void,
	): Promise<void>;
}

export class App {
	vault: Vault;
	workspace: Workspace;
	metadataCache: MetadataCache;
	fileManager: FileManager;
	setting: {
		open(): void;
		openTabById(id: string): void;
	};
}

export class Plugin {
	app: App;
	manifest: PluginManifest;
	onload(): void | Promise<void>;
	onunload(): void;
	addRibbonIcon(icon: string, title: string, callback: (evt: MouseEvent) => void): HTMLElement;
	addCommand(command: Command): Command;
	addSettingTab(settingTab: PluginSettingTab): void;
	registerEvent(eventRef: EventRef): void;
	loadData(): Promise<unknown>;
	saveData(data: unknown): Promise<void>;
}

export class PluginSettingTab {
	app: App;
	containerEl: HTMLElement;
	constructor(app: App, plugin: Plugin);
	display(): void;
	update(): void;
}

export class Notice {
	constructor(message: string | DocumentFragment, timeout?: number);
	hide(): void;
}

export class Modal {
	app: App;
	contentEl: HTMLElement;
	titleEl: HTMLElement;
	constructor(app: App);
	open(): void;
	close(): void;
	onOpen(): void;
	onClose(): void;
}

export class DropdownComponent {
	addOption(value: string, display: string): this;
	setValue(value: string): this;
	setDisabled(disabled: boolean): this;
	onChange(callback: (value: string) => void | Promise<void>): this;
}

export class ToggleComponent {
	setValue(value: boolean): this;
	onChange(callback: (value: boolean) => void | Promise<void>): this;
}

export class TextComponent {
	inputEl: HTMLInputElement;
	setPlaceholder(placeholder: string): this;
	setValue(value: string): this;
	onChange(callback: (value: string) => void | Promise<void>): this;
}

export class ExtraButtonComponent {
	setIcon(icon: string): this;
	setTooltip(tooltip: string): this;
	onClick(callback: () => void): this;
}

export class Setting {
	constructor(containerEl: HTMLElement);
	setName(name: string): this;
	setDesc(desc: string | DocumentFragment): this;
	setHeading(): this;
	addDropdown(cb: (component: DropdownComponent) => void): this;
	addToggle(cb: (component: ToggleComponent) => void): this;
	addText(cb: (component: TextComponent) => void): this;
	addExtraButton(cb: (component: ExtraButtonComponent) => void): this;
}

export class MarkdownRenderer {
	static render(
		app: App,
		markdown: string,
		el: HTMLElement,
		sourcePath: string,
		component: Component,
	): Promise<void>;
}

export function requestUrl(request: RequestUrlParam): Promise<RequestUrlResponse>;
export function getLanguage(): string;
export function requireApiVersion(version: string): boolean;
export function createFragment(cb?: (el: DocumentFragment) => void): DocumentFragment;

interface DomElementInfo {
	cls?: string | string[];
	text?: string;
	attr?: Record<string, string>;
	title?: string;
	href?: string;
	type?: string;
	placeholder?: string;
	value?: string;
}

interface SvgElementInfo {
	cls?: string | string[];
	attr?: Record<string, string>;
}

declare global {
	interface Element {
		empty(): void;
		addClass(...classes: string[]): void;
		removeClass(...classes: string[]): void;
		hasClass(cls: string): boolean;
		toggleClass(cls: string, value: boolean): void;
		setCssProps(props: Record<string, string>): void;
	}

	interface HTMLElement {
		setText(val: string): this;
		appendText(val: string): this;
		createDiv(info?: DomElementInfo): HTMLDivElement;
		createSpan(info?: DomElementInfo): HTMLSpanElement;
		createEl<K extends keyof HTMLElementTagNameMap>(
			tag: K,
			info?: DomElementInfo,
		): HTMLElementTagNameMap[K];
		createSvg<K extends keyof SVGElementTagNameMap>(
			tag: K,
			info?: SvgElementInfo,
		): SVGElementTagNameMap[K];
	}

	interface SVGElement {
		createSvg<K extends keyof SVGElementTagNameMap>(
			tag: K,
			info?: SvgElementInfo,
		): SVGElementTagNameMap[K];
	}

	interface DocumentFragment {
		appendText(val: string): this;
		createEl<K extends keyof HTMLElementTagNameMap>(
			tag: K,
			info?: DomElementInfo,
		): HTMLElementTagNameMap[K];
	}

	function createFragment(cb?: (el: DocumentFragment) => void): DocumentFragment;
}
