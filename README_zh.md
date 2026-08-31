# Share Page — Obsidian 插件

[English](README.md)

一键将当前 Obsidian 笔记分享为 [htmlto.link](https://htmlto.link) 精美网页，并复制公开链接。

## 功能

- **一键分享** — 左侧功能区、命令面板（`分享当前笔记`），或文件列表右键
- **同一链接可更新** — 再次分享同一篇笔记会更新原网址；改名或移动文件夹后仍认得出，不会变成新链接
- **30+ 模板** — 备忘录、波普艺术、中国传统、线圈笔记本、赛博朋克、玻璃拟态等
- **主题变体** — 每个模板支持多种配色（如备忘录的明亮/暗黑模式）
- **自适应宽度** — 分享页随屏幕宽度自动适配
- **删除分享** — 移除已分享的链接（`删除当前笔记的分享`）
- **Frontmatter 集成** — 分享成功后自动写入 `share_link` 和 `share_updated` 到笔记属性
- **多语言** — 界面跟随 Obsidian 语言（English / 中文），也可手动设置
- **Token 引导** — 说明如何从 htmlto.link 设置页获取 API Token，并提供一键跳转

## 安装

### 从 Obsidian 社区插件安装（即将上架）

设置 → 社区插件 → 浏览 → 搜索 **"Share Page"**。

### 手动安装 / BRAT

1. 从最新 [GitHub Release](https://github.com/licc168/obsidian-htmlto-link/releases) 下载 `main.js`、`manifest.json`、`styles.css`。
2. 放入 `<你的Vault>/.obsidian/plugins/htmlto-link/` 目录。
3. 设置 → 社区插件 → 启用 **Share Page**。

### 从源码构建

```bash
git clone https://github.com/licc168/obsidian-htmlto-link.git
cd obsidian-htmlto-link
npm install
npm run build
```

将 `main.js`、`manifest.json`、`styles.css` 复制到 Vault 的插件目录。

## 使用方法

1. 打开任意 Markdown 笔记。
2. `Ctrl/Cmd + P` → 搜索 **分享当前笔记**（或点击左侧功能区的分享图标，或在文件列表右键笔记）。
3. 选择模板/主题（可选），确认发布。未保存的编辑也会一并发布。
4. 分享链接自动复制到剪贴板。

删除分享：`Ctrl/Cmd + P` → **删除当前笔记的分享**。

## 设置项

| 设置 | 说明 |
|------|------|
| API Token | 可选。留空=游客（24h）；登录 [htmlto.link/settings](https://htmlto.link/settings) 复制 API Token 后粘贴，链接归账号且有效期更长 |
| 默认模板 | memo / popart / traditionalchinese / coilnotebook / … |
| 主题 class | 如 `bright-mode`、`candy-mode` |
| 界面语言 | 自动 / English / 中文 |
| 成功后复制链接 | 默认开启 |
| 成功后打开浏览器 | 默认关闭 |
| 写入分享信息到笔记 | 将 `share_link` / `share_updated` 写入 frontmatter |
| 发布时弹出选项框 | 模板和主题选择对话框 |

## 隐私与数据

- **网络访问：** 用户执行发布时，插件会将当前笔记的 Markdown 和其中引用的本地图片发送到所配置的 API 服务器，以创建或更新分享页面；删除分享也会访问该服务器。网络请求只发生在这些由用户主动触发的操作中，插件不会扫描或上传 Vault 中的其他笔记。
- **服务器存储：** 所配置的服务会保存已发布的笔记内容和上传的图片，用于提供生成的公开页面。任何获得公开分享链接的人都可能查看已发布内容。本插件当前使用的服务不提供端到端加密分享。
- **保存期限：** 游客分享链接 24 小时后过期；绑定账号的分享按照服务端返回的期限和适用套餐保存。可使用“删除当前笔记的分享”请求删除分享内容。
- **遥测：** 插件不会发送启动 ping，也不会收集客户端使用统计。服务端可能记录运行发布 API 所必需的最少请求信息，详见 [HTML To Link 隐私政策](https://htmlto.link/privacy-policy)。
- **剪贴板访问：** 发布成功后，仅当“成功后复制链接”已启用时，插件才会把生成的公开 URL 写入剪贴板。
- **Vault 访问：** 插件只读取当前分享的笔记及其中引用的本地图片；仅在对应设置已启用时，才向该笔记写入 `share_link` 和 `share_updated`。
- **本地数据：** 设置、分享更新令牌和图片缓存记录通过 Obsidian 插件数据 API 保存。

## 开发

```bash
npm install
npm run dev    # watch 模式，改代码自动重新打包
npm run build  # 生产构建
```

## 目录结构

```
obsidian-htmlto-link/
├── manifest.json
├── package.json
├── styles.css
├── esbuild.config.mjs
├── src/
│   ├── main.ts        # 插件入口
│   ├── settings.ts    # 设置页
│   ├── constants.ts   # 默认配置 / 模板列表
│   ├── api.ts         # API 客户端
│   ├── publish.ts     # 分享与删除逻辑
│   └── i18n.ts        # 国际化
└── README.md
```

## 许可证

[MIT](LICENSE)
