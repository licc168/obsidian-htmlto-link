declare module "@codemirror/state" {
	export class Extension {
		private readonly brand: unknown;
	}

	export class StateField<T = unknown> {
		private readonly brand: T;
	}
}

declare module "@codemirror/view" {
	export class EditorView {
		private readonly brand: unknown;
	}

	export class ViewPlugin<T = unknown, U = unknown> {
		private readonly brand: T;
	}
}

declare module "moment" {
	const moment: {
		(): unknown;
		[key: string]: unknown;
	};
	export = moment;
}
