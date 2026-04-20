import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const scriptPath = "/Users/eziosnone/Github/clsskill/scripts/apm-trace-env.sh";

describe("apm-trace-env.sh", () => {
  it("在缺少 APM instanceId 时仍允许辅助模式工作", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "apm-trace-env-"));
    const envFile = join(tempDir, ".env.test.local");
    const toolDir = join(tempDir, "tools", "apm-trace-cli");

    await mkdir(toolDir, { recursive: true });
    await writeFile(join(toolDir, "package.json"), "{\"name\":\"tmp\"}\n", "utf8");
    await writeFile(
      envFile,
      [
        "TENCENTCLOUD_SECRET_ID=test-secret-id",
        "TENCENTCLOUD_SECRET_KEY=test-secret-key",
        "TENCENTCLOUD_REGION=ap-shanghai"
      ].join("\n"),
      "utf8"
    );

    const baseEnv = {
      ...process.env,
      APM_TRACE_ENV_FILE: envFile,
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      TOOL_DIR_OVERRIDE: toolDir
    };

    const envFileResult = await execFileAsync("bash", [scriptPath, "--env-file"], {
      env: baseEnv
    });
    expect(envFileResult.stdout.trim()).toBe(envFile);

    const exportResult = await execFileAsync("bash", [scriptPath, "--export-sh"], {
      env: baseEnv
    });
    expect(exportResult.stdout).toContain("export TENCENTCLOUD_SECRET_ID=test-secret-id");
    expect(exportResult.stdout).toContain("export TENCENTCLOUD_SECRET_KEY=test-secret-key");
    expect(exportResult.stdout).toContain("export TENCENTCLOUD_REGION=ap-shanghai");
    expect(exportResult.stdout).not.toContain("TENCENTCLOUD_APM_INSTANCE_ID");

    const checkResult = await execFileAsync("bash", [scriptPath, "--check"], {
      env: baseEnv
    });
    expect(checkResult.stdout).toContain("APM Node CLI 与本地配置校验通过");
    expect(checkResult.stdout).toContain("未配置 TENCENTCLOUD_APM_INSTANCE_ID");
  });

  it("只读模式不应依赖工具目录已存在", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "apm-trace-env-readonly-"));
    const envFile = join(tempDir, ".env.test.local");
    const missingToolDir = join(tempDir, "missing-tool-dir");

    await writeFile(
      envFile,
      [
        "TENCENTCLOUD_SECRET_ID=test-secret-id",
        "TENCENTCLOUD_SECRET_KEY=test-secret-key",
        "TENCENTCLOUD_REGION=ap-shanghai"
      ].join("\n"),
      "utf8"
    );

    const envFileResult = await execFileAsync("bash", [scriptPath, "--env-file"], {
      env: {
        ...process.env,
        APM_TRACE_ENV_FILE: envFile,
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        TOOL_DIR_OVERRIDE: missingToolDir
      }
    });

    expect(envFileResult.stdout.trim()).toBe(envFile);
  });
});
