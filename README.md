# Share Page（Obsidian 插件）

一键将当前 Obsidian 笔记分享为 [htmlto.link](https://htmlto.link) 精美网页，并复制公开链接。

## 功能

- 命令面板：`Share current note`
- 左侧功能区「分享」图标一键分享
- 可选模板（备忘录 / 波普艺术 / 中国传统 / 线圈笔记本…）
- 分享成功后：复制链接 / 打开浏览器 / 追加到笔记末尾
- 可配置 API 地址（默认 `https://htmlto.link`，支持自建）

## 安装（开发版）

### 1. 构建

```bash
cd htmlto-link-obsidian
npm install
npm run build
```

会生成 `main.js`。

### 2. 装到 Obsidian

1. 打开 Obsidian → 设置 → 社区插件 → 关闭「受限模式」
2. 在 vault 下创建插件目录：

```
<你的Vault>/.obsidian/plugins/htmlto-link/
```

3. 复制以下文件到该目录：

- `main.js`
- `manifest.json`
- `styles.css`

4. 设置 → 社区插件 → 启用 **Share Page**

### 3. 使用

1. 打开任意 Markdown 笔记
2. `Ctrl/Cmd + P` → 搜索 `Share current note`
3. 等待提示「分享成功」并复制链接
4. 浏览器打开链接即可查看

## 设置项

| 设置 | 说明 |
|------|------|
| API 地址 | 默认 `https://htmlto.link` |
| 默认模板 | memo / popart / traditionalchinese / coilnotebook… |
| 主题 class | 如 `bright-mode`、`candy-mode` |
| 卡片宽度 | 360 / 440 / 520 / 640 |
| 复制链接 | 默认开启 |
| 打开浏览器 | 默认关闭 |
| 追加到笔记 | 默认关闭 |

## 开发

```bash
npm install
npm run dev    # watch 模式，改代码自动重新打包 main.js
npm run build  # 生产构建
```

开发时可用符号链接把本仓库指到 vault 插件目录，改完自动生效：

```powershell
# Windows 示例（管理员或开发者模式）
New-Item -ItemType Junction `
  -Path "D:\path\to\vault\.obsidian\plugins\htmlto-link" `
  -Target "D:\licc\htmltolink\htmlto-link-obsidian"
```

然后在该目录执行 `npm run dev`，Obsidian 里 `Ctrl+R` 重载插件。

## 当前限制（MVP）

1. **游客分享**：走 `/api/shares`，链接有有效期（与网站一致）
2. **本地图片**：`![[image.png]]` / 相对路径图片暂不自动上传，建议用外链
3. **Wiki 链接**：`[[笔记]]` 会转成纯文本显示名，不做跨页跳转
4. **登录账号 / 长期链接**：后续版本可接 token

## API

```http
POST {apiBaseUrl}/api/shares
Content-Type: application/json

{
  "markdown": "# Hello",
  "templateId": "memo",
  "themeClass": "bright-mode",
  "cardWidth": 440
}
```

成功响应示例：

```json
{
  "ok": true,
  "id": "xxxx",
  "url": "https://htmlto.link/s/xxxx",
  "expiresAt": "..."
}
```

## 目录结构

```
htmlto-link-obsidian/
├── manifest.json
├── package.json
├── styles.css
├── esbuild.config.mjs
├── src/
│   ├── main.ts        # 插件入口
│   ├── settings.ts    # 设置页
│   ├── constants.ts   # 默认配置 / 模板列表
│   ├── api.ts         # 调用 /api/shares
│   └── publish.ts     # 读笔记 + 发布流程
└── README.md
```

## License

MIT
