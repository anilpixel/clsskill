import type { AppConfig } from "./types.js";

export class CliError extends Error {
  readonly code: string;
  readonly requestId?: string;

  constructor(code: string, message: string, requestId?: string) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.requestId = requestId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value) {
    throw new CliError("CONFIG_MISSING", `缺少环境变量：${key}`);
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    secretId: requireEnv(env, "TENCENTCLOUD_SECRET_ID"),
    secretKey: requireEnv(env, "TENCENTCLOUD_SECRET_KEY"),
    region: env.TENCENTCLOUD_REGION
  };
}
