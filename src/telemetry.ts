import { createHash } from 'crypto';
import { hostname, userInfo } from 'os';

const PING_ENDPOINT = '/api/telemetry/ping';

export interface TelemetryConfig {
  /** 插件标识名，如 'htmlto-link-obsidian' */
  extName: string;
  /** 插件版本号 */
  extVersion: string;
  /** 后端 API 基地址，如 'https://htmlto.link' */
  apiBaseUrl: string;
}

/**
 * 生成匿名机器标识（不可逆哈希，保护隐私）
 */
function getAnonymousId(): string {
  const raw = [
    hostname(),
    userInfo().username,
    typeof navigator !== 'undefined' ? navigator.userAgent : '',
  ].join('|');
  return createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

/**
 * 发送一次激活 ping（fire-and-forget，不阻塞插件启动）
 */
export function sendActivationPing(config: TelemetryConfig): void {
  const url = `${config.apiBaseUrl}${PING_ENDPOINT}`;
  const body = JSON.stringify({
    id: getAnonymousId(),
    ext: config.extName,
    extVersion: config.extVersion,
    vscodeVersion: '',
    platform: process.platform,
    arch: process.arch,
    ts: Date.now(),
  });

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => {
    // 静默忽略所有错误，绝不影响用户体验
  });
}
