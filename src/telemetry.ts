import { Platform, requestUrl, type App } from "obsidian";

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
  if (Platform.isWin) return "win32";
  if (Platform.isLinux) return "linux";
  return "unknown";
}

/**
 * 生成 vault 专属的匿名标识。使用 Obsidian 的存储封装，避免跨 vault 共享。
 */
function getAnonymousId(app: App): string {
  const key = "htmlto-link-anonymous-id";
  const stored: unknown = app.loadLocalStorage(key);
  if (typeof stored === "string" && stored.length >= 16) {
    return stored.slice(0, 16);
  }

  const id = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  app.saveLocalStorage(key, id);
  return id.slice(0, 16);
}

/**
 * 发送一次激活 ping（fire-and-forget，不阻塞插件启动）
 */
export function sendActivationPing(app: App, config: TelemetryConfig): void {
  const url = `${config.apiBaseUrl}${PING_ENDPOINT}`;
  try {
    const id = getAnonymousId(app);
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
  } catch {
    // 本地存储不可用时不发送遥测，绝不影响插件启动
  }
}
