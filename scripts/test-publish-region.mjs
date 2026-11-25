import assert from "node:assert/strict";
import test from "node:test";
import {
	isManagedPublishBase,
	regionFromBaseUrl,
	shareUrlForRegion,
} from "../src/publish-region.ts";

test("mainland share links use htmlto.cn", () => {
	assert.equal(
		shareUrlForRegion("https://htmlto.link/abc123", "cn"),
		"https://htmlto.cn/abc123",
	);
	assert.equal(
		shareUrlForRegion("https://www.htmlto.link/abc123?from=share", "cn"),
		"https://htmlto.cn/abc123?from=share",
	);
	assert.equal(
		shareUrlForRegion("https://demo.htmlto.link/abc123", "cn"),
		"https://htmlto.cn/abc123",
	);
});

test("international share links stay on htmlto.link", () => {
	assert.equal(
		shareUrlForRegion("https://htmlto.cn/abc123", "intl"),
		"https://htmlto.link/abc123",
	);
	assert.equal(
		shareUrlForRegion("https://customer.example/page", "cn"),
		"https://customer.example/page",
	);
});

test("only the two official sites are switched by the publish choice", () => {
	assert.equal(isManagedPublishBase(""), true);
	assert.equal(isManagedPublishBase("https://htmlto.cn"), true);
	assert.equal(isManagedPublishBase("https://api.example.com"), false);
	assert.equal(regionFromBaseUrl("https://www.htmlto.cn"), "cn");
	assert.equal(regionFromBaseUrl("https://htmlto.link"), "intl");
});
