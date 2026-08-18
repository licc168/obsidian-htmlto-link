# Share Page — Obsidian Plugin

[中文文档](README_zh.md)

Instantly share any Obsidian note as a beautiful webpage via [htmlto.link](https://htmlto.link) and copy the public link.

## Features

- **One-click share** — Ribbon, command palette (`Share current note`), or right-click a file
- **Same URL on update** — Re-sharing a note updates the existing link; rename or move the file and it still matches
- **30+ templates** — Memo, Pop Art, Traditional Chinese, Coil Notebook, Cyberpunk, Glassmorphism, and more
- **Theme variants** — Multiple color themes per template (e.g. Bright / Dark for Memo)
- **Responsive layout** — Share pages adapt to screen width automatically
- **Delete share** — Remove a previously shared link (`Delete share for current note`)
- **Frontmatter integration** — Automatically writes `share_link` and `share_updated` to note properties after sharing
- **i18n** — UI follows Obsidian language (English / 中文), or set manually
- **API Token help** — Clear steps and a one-click link to get your token from htmlto.link settings

## Installation

### From Obsidian Community Plugins

Search **"Share Page"** in Settings → Community plugins → Browse.

### Manual / BRAT

1. Download `main.js`, `manifest.json`, `styles.css` from the latest [GitHub Release](https://github.com/licc168/obsidian-htmlto-link/releases).
2. Place them in `<your-vault>/.obsidian/plugins/htmlto-link/`.
3. Enable **Share Page** in Settings → Community plugins.

### Build from source

```bash
git clone https://github.com/licc168/obsidian-htmlto-link.git
cd obsidian-htmlto-link
npm install
npm run build
```

Copy `main.js`, `manifest.json`, `styles.css` to your vault's plugin directory.

## Usage

1. Open any Markdown note.
2. `Ctrl/Cmd + P` → search **Share current note** (or click the share icon in the ribbon, or right-click the note in the file list).
3. Pick a template / theme (optional), then confirm. Unsaved edits in the editor are included.
4. The share link is copied to your clipboard automatically.

To remove a share: `Ctrl/Cmd + P` → **Delete share for current note**.

## Settings

| Setting | Description |
|---------|-------------|
| API Token | Optional. Empty = guest (24h). Sign in at [htmlto.link/settings](https://htmlto.link/settings), copy API Token, paste here for account-bound longer lifetime |
| Default Template | memo / popart / traditionalchinese / coilnotebook / … |
| Theme Class | e.g. `bright-mode`, `candy-mode` |
| Language | Auto / English / 中文 |
| Copy link on success | Enabled by default |
| Open in browser | Disabled by default |
| Write share info to note | Writes `share_link` / `share_updated` to frontmatter |
| Show options on publish | Template & theme picker dialog |

## Privacy & Data

- The plugin sends the **note content** (Markdown) to the configured API server to generate a share page.
- No data is collected beyond what is needed for the share request.
- Guest shares expire after 24 hours.

## Development

```bash
npm install
npm run dev    # watch mode
npm run build  # production build
```

## Project Structure

```
obsidian-htmlto-link/
├── manifest.json
├── package.json
├── styles.css
├── esbuild.config.mjs
├── src/
│   ├── main.ts        # Plugin entry
│   ├── settings.ts    # Settings tab
│   ├── constants.ts   # Defaults / templates
│   ├── api.ts         # API client
│   ├── publish.ts     # Share & delete logic
│   └── i18n.ts        # Internationalization
└── README.md
```

## License

[MIT](LICENSE)
