export type JsonObject = Record<string, unknown>;

export function parseJsonObject(text: string): JsonObject {
	const parsed: unknown = JSON.parse(text || "{}");
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new TypeError("Expected a JSON object");
	}
	return parsed as JsonObject;
}

export function optionalString(
	object: JsonObject,
	key: string,
): string | undefined {
	const value = object[key];
	return typeof value === "string" ? value : undefined;
}

export function optionalBoolean(
	object: JsonObject,
	key: string,
): boolean | undefined {
	const value = object[key];
	return typeof value === "boolean" ? value : undefined;
}
