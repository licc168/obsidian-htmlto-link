# Share Page — Obsidian Plugin

[中文文档](README_zh.md)

Instantly share any Obsidian note as a beautiful webpage via [htmlto.link](https://htmlto.link) and copy the public link.

## Features

- **One-click share** — Ribbon, command palette (`Share current note`), or right-click a file
- **Same URL on update** — Re-sharing a note updates the existing link; rename or move the file and it still matches
- **30+ templates** — Memo, Pop Art, Traditional Chinese, Coil Notebook, Cyberpunk, Glassmorphism, and more
- **Theme variants** — Multiple color themes per template (e.g. Bright / Dark for Memo)
- **Local template preview** — Switch template and theme from the top-right of the current Markdown page without publishing or uploading the note
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
2. Use the **Template** and **Theme** dropdowns at the top-right of the page to preview locally. Choose **Obsidian original** to exit preview.
3. To publish, use `Ctrl/Cmd + P` → **Share current note** (or the ribbon icon/right-click menu).
4. Confirm the template/theme in the publish dialog. Unsaved edits are included and the share link is copied automatically.

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

Template preview is not a separate setting. It is enabled from the Markdown page controls and remains separate from publishing.

## Privacy & Data

- **Network access:** Template preview runs locally and does not send the note content or upload local images. When you publish, the plugin sends the current note's Markdown and referenced local images to the configured API server to create or update the share page. Deleting a share also contacts that server. Requests are made only for these user-initiated operations; the plugin does not scan or upload the rest of the vault.
- **Server-side storage:** The configured service stores the published note content and uploaded images to serve the resulting public page. Anyone with the public share URL may be able to view the published content. The current service does not provide end-to-end encryption for this plugin's shares.
- **Retention:** Guest shares expire after 24 hours. Account-bound shares follow the retention period returned by the service and the applicable plan. Use **Delete share for current note** to request deletion of a share.
- **Telemetry:** The plugin does not send startup pings or client-side usage analytics. The service may record the minimum request information needed to operate the publishing API; see the [HTML To Link Privacy Policy](https://htmlto.link/privacy-policy).
- **Clipboard access:** After a successful publish, the plugin writes only the resulting public URL to the clipboard when “Copy link on success” is enabled.
- **Vault access:** The plugin reads only the note being shared and its referenced local images. It writes `share_link` and `share_updated` to that note only when the corresponding setting is enabled.
- **Local data:** Settings, share-update tokens, and image cache records are stored through Obsidian's plugin data API.

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
│   ├── template-preview/ # Local template preview
│   └── i18n.ts        # Internationalization
├── scripts/
│   └── sync-template-assets.mjs # Sync html2url template CSS
└── README.md
```

## License

[MIT](LICENSE)
