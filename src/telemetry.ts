import { Platform, requestUrl } from "obsidian";

const PING_ENDPOINT = "/api/telemetry/ping";

export interface TelemetryConfig {
  /** 插件标识名，如 'htmlto-link-obsidian' */
  extName: string;
  /** 插件版本号 */
  extVersion: string;
  /** 后端 API 基地址，如 'https://htmlto.link' */
  apiBaseUrl: string;
}

/** 从 Platform 布尔值推导平台字符串 */
function getPlatformString(): string {
  if (Platform.isMacOS) return "darwin";
  if (Platform.isAndroidApp) return "android";
  if (Platform.isIosApp) return "ios";
  if (Platform.isDesktopApp) return "win32"; // 桌面非 Mac 大概率 Windows/Linux
  return "unknown";
}

/**
 * 生成匿名机器标识（不可逆哈希，保护隐私）
 * 桌面端使用 crypto+os，移动端回退到 localStorage
 */
async function getAnonymousId(): Promise<string> {
  if (Platform.isDesktop) {
    try {
      const crypto = await import("crypto");
      const os = await import("os");
      const raw = [
        os.hostname(),
        os.userInfo().username,
        getPlatformString(),
      ].join("|");
      return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
    } catch {
      // 动态 import 失败时回退
    }
  }
  // 移动端或 import 失败：用 localStorage 存一个随机 ID
  try {
    const key = "htmlto-link-machine-id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(key, id);
    }
    return id.slice(0, 16);
  } catch {
    return "unknown";
  }
}

/**
 * 发送一次激活 ping（fire-and-forget，不阻塞插件启动）
 */
export function sendActivationPing(config: TelemetryConfig): void {
  const url = `${config.apiBaseUrl}${PING_ENDPOINT}`;

  getAnonymousId().then((id) => {
    const body = JSON.stringify({
      id,
      ext: config.extName,
      extVersion: config.extVersion,
      vscodeVersion: "",
      platform: getPlatformString(),
      arch: "",
      ts: Date.now(),
    });

    requestUrl({
      url,
      method: "POST",
      contentType: "application/json",
      body,
    }).catch(() => {
      // 静默忽略所有错误，绝不影响用户体验
    });
  }).catch(() => {
    // 静默忽略
  });
}
