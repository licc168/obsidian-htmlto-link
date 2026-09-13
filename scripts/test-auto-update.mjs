import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { transform } from "esbuild";

const source = await readFile(
	new URL("../src/auto-update-core.ts", import.meta.url),
	"utf8",
);
const { code } = await transform(source, { loader: "ts", format: "cjs" });
const module = { exports: {} };
const fn = new Function("module", "exports", code);
fn(module, module.exports);

const {
	AUTO_UPDATE_DEBOUNCE_MS,
	DebouncedPathScheduler,
	PathMutex,
	autoUpdateFailureAction,
	fingerprintMarkdown,
	shouldScheduleAutoUpdate,
	shouldSkipUnchanged,
} = module.exports;

class FakeClock {
	constructor() {
		this.now = 0;
		this.timers = [];
		this.nextId = 1;
	}
	setTimeout(fn, ms) {
		const id = this.nextId++;
		this.timers.push({ id, at: this.now + ms, fn });
		return id;
	}
	clearTimeout(id) {
		this.timers = this.timers.filter((timer) => timer.id !== id);
	}
	async advance(ms) {
		this.now += ms;
		for (;;) {
			const due = this.timers
				.filter((timer) => timer.at <= this.now)
				.sort((a, b) => a.at - b.at);
			if (due.length === 0) break;
			const dueIds = new Set(due.map((timer) => timer.id));
			this.timers = this.timers.filter((timer) => !dueIds.has(timer.id));
			for (const timer of due) await timer.fn();
		}
	}
}

assert.equal(fingerprintMarkdown("hello"), fingerprintMarkdown("hello"));
assert.notEqual(fingerprintMarkdown("hello"), fingerprintMarkdown("hello!"));
assert.equal(fingerprintMarkdown("笔记 **加粗**"), fingerprintMarkdown("笔记 **加粗**"));

assert.equal(shouldScheduleAutoUpdate(false, "md", true, false), false);
assert.equal(shouldScheduleAutoUpdate(true, "png", true, false), false);
assert.equal(shouldScheduleAutoUpdate(true, "md", false, false), false);
assert.equal(shouldScheduleAutoUpdate(true, "md", true, true), false);
assert.equal(shouldScheduleAutoUpdate(true, "md", true, false), true);

assert.equal(shouldSkipUnchanged("abc", ""), true);
assert.equal(shouldSkipUnchanged(undefined, "body"), false);
assert.equal(
	shouldSkipUnchanged(fingerprintMarkdown("body"), "body"),
	true,
);
assert.equal(
	shouldSkipUnchanged(fingerprintMarkdown("old"), "new"),
	false,
);

assert.equal(autoUpdateFailureAction(404, false), "drop");
assert.equal(autoUpdateFailureAction(403, false), "pause");
assert.equal(autoUpdateFailureAction(401, false), "pause");
assert.equal(autoUpdateFailureAction(429, false), "retry");
assert.equal(autoUpdateFailureAction(undefined, true), "retry");
assert.notEqual(autoUpdateFailureAction(404, false), "create");
assert.notEqual(autoUpdateFailureAction(403, false), "create");

{
	const runs = [];
	const clock = new FakeClock();
	const scheduler = new DebouncedPathScheduler(
		AUTO_UPDATE_DEBOUNCE_MS,
		async (path) => {
			runs.push(path);
		},
		clock,
	);
	scheduler.schedule("a.md");
	scheduler.schedule("a.md");
	scheduler.schedule("a.md");
	await clock.advance(AUTO_UPDATE_DEBOUNCE_MS - 1);
	assert.deepEqual(runs, []);
	await clock.advance(1);
	assert.deepEqual(runs, ["a.md"]);
}

{
	const runs = [];
	const clock = new FakeClock();
	const scheduler = new DebouncedPathScheduler(
		AUTO_UPDATE_DEBOUNCE_MS,
		async (path) => {
			runs.push(path);
		},
		clock,
	);
	scheduler.schedule("a.md");
	scheduler.cancel("a.md");
	await clock.advance(AUTO_UPDATE_DEBOUNCE_MS + 50);
	assert.deepEqual(runs, []);
}

{
	let release;
	const gate = new Promise((resolve) => {
		release = resolve;
	});
	const runs = [];
	const clock = new FakeClock();
	const scheduler = new DebouncedPathScheduler(
		AUTO_UPDATE_DEBOUNCE_MS,
		async (path) => {
			runs.push(`start:${path}`);
			await gate;
			runs.push(`end:${path}`);
		},
		clock,
	);
	scheduler.schedule("a.md");
	const first = clock.advance(AUTO_UPDATE_DEBOUNCE_MS);
	await Promise.resolve();
	assert.deepEqual(runs, ["start:a.md"]);
	scheduler.schedule("a.md");
	release();
	await first;
	assert.deepEqual(runs, ["start:a.md", "end:a.md"]);
	await clock.advance(AUTO_UPDATE_DEBOUNCE_MS);
	assert.deepEqual(runs, ["start:a.md", "end:a.md", "start:a.md", "end:a.md"]);
}

{
	const order = [];
	const mutex = new PathMutex();
	let releaseFirst;
	const firstGate = new Promise((resolve) => {
		releaseFirst = resolve;
	});
	const first = mutex.run("a.md", async () => {
		order.push("first-start");
		await firstGate;
		order.push("first-end");
		return 1;
	});
	const second = mutex.run("a.md", async () => {
		order.push("second");
		return 2;
	});
	assert.deepEqual(order, ["first-start"]);
	releaseFirst();
	assert.equal(await first, 1);
	assert.equal(await second, 2);
	assert.deepEqual(order, ["first-start", "first-end", "second"]);
}

console.log(
	"PASS: fingerprint, schedule gates, skip hash, failure policy, debounce, cancel, in-flight queue, mutex",
);
