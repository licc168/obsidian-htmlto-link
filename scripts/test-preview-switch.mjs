import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { transform } from "esbuild";

// Exercise the real controller methods without requiring the Obsidian UI.
const source = await readFile(new URL("../src/template-preview/controller.ts", import.meta.url), "utf8");
const { code } = await transform(
  source.replace(/^import[\s\S]*?from\s+["'][^"']+["'];\r?\n/gm, ""),
  {
  loader: "ts", format: "cjs",
});
const pending = [];
const context = {
  exports: {}, module: { exports: {} },
  window: { setTimeout, clearTimeout },
  prepareMarkdown: (raw) => raw,
  renderLocalTemplatePreview: ({ markdown }) => new Promise((resolve) => pending.push({ markdown, resolve })),
};
vm.runInNewContext(code, context);
const { TemplatePreviewController } = context.module.exports;
const controller = Object.create(TemplatePreviewController.prototype);
const a = { path: "a.md" };
const b = { path: "b.md" };
Object.assign(controller, {
  plugin: { app: { vault: { read: async (file) => `disk:${file.path}` } } },
  view: { file: a, editor: { getValue: () => "STALE EDITOR" } },
  currentFilePath: a.path, templateId: "test", themeClass: "",
  renderToken: 0, debounceTimer: null, disposed: false, editorSnapshot: null,
  iframe: { srcdoc: "" }, toolbar: { setBusy() {} },
  mermaidFullscreen: { close() {} },
  tableFullscreen: { close() {} },
});
const flush = () => new Promise(setImmediate);
const first = controller.renderNow();
await flush();
assert.equal(pending[0].markdown, "disk:a.md");
controller.view.file = b;
controller.handleViewFileChange();
await flush();
assert.equal(pending[1].markdown, "disk:b.md", "switch must not read the stale editor");
pending[1].resolve("B preview");
await flush();
pending[0].resolve("A preview");
await first;
assert.equal(controller.iframe.srcdoc, "B preview", "late A must not replace B");
controller.view.editor.getValue = () => "unsaved B";
controller.handleEditorChange(controller.view);
clearTimeout(controller.debounceTimer);
const edited = controller.renderNow();
await flush();
assert.equal(pending[2].markdown, "unsaved B");
pending[2].resolve("edited B");
await edited;
controller.view.file = a;
controller.handleViewFileChange();
await flush();
assert.equal(pending[3].markdown, "disk:a.md", "editor snapshot must not follow a file switch");
pending[3].resolve("A again");
await flush();
assert.equal(controller.iframe.srcdoc, "A again");
console.log("PASS: first render, stale editor on switch, out-of-order completion, unsaved edits, switch back");
