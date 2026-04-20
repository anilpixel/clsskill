import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  stat,
  symlink,
  utimes,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const scriptPath = "/Users/eziosnone/Github/clsskill/scripts/apm-trace-run.sh";

describe("apm-trace-run.sh", () => {
  it("参数校验失败时仍返回结构化 JSON 错误", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "apm-trace-run-"));
    const envFile = join(tempDir, ".env.test.local");

    await writeFile(
      envFile,
      [
        "TENCENTCLOUD_SECRET_ID=test-secret-id",
        "TENCENTCLOUD_SECRET_KEY=test-secret-key",
        "TENCENTCLOUD_REGION=ap-shanghai"
      ].join("\n"),
      "utf8"
    );

    const result = spawnSync("bash", [scriptPath, "get"], {
      env: {
        ...process.env,
        APM_TRACE_ENV_FILE: envFile,
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? ""
      },
      encoding: "utf8"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toEqual({
      ok: false,
      error: {
        code: "CLI_USAGE_ERROR",
        message: "required option '--trace-id <traceId>' not specified"
      }
    });
  });

  it("当锁文件比 node_modules 更新时会重新执行 npm install", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "apm-trace-install-"));
    const envFile = join(tempDir, ".env.test.local");
    const installCaptureFile = join(tempDir, "install-args.txt");
    const fakeNodePath = join(tempDir, "node");
    const fakeNpmPath = join(tempDir, "npm");
    const binDir = join(tempDir, "bin");
    const toolDir = "/Users/eziosnone/Github/clsskill/tools/apm-trace-cli";
    const nodeModulesLockPath = join(toolDir, "node_modules", ".package-lock.json");
    const originalNodeModulesLockStat = await stat(nodeModulesLockPath);

    await mkdir(binDir);
    await symlink("/bin/bash", join(binDir, "bash"));
    await symlink("/bin/cat", join(binDir, "cat"));
    await symlink("/usr/bin/dirname", join(binDir, "dirname"));

    await writeFile(
      fakeNodePath,
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        "cat <<'EOF'",
        '{"ok":false,"error":{"code":"CLI_USAGE_ERROR","message":"required option \'--trace-id <traceId>\' not specified"}}',
        "EOF",
        "exit 1"
      ].join("\n"),
      "utf8"
    );
    await chmod(fakeNodePath, 0o755);

    await writeFile(
      fakeNpmPath,
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        `printf '%s\\n' "$*" >> "${installCaptureFile}"`,
        "exit 0"
      ].join("\n"),
      "utf8"
    );
    await chmod(fakeNpmPath, 0o755);

    await writeFile(
      envFile,
      [
        "TENCENTCLOUD_SECRET_ID=test-secret-id",
        "TENCENTCLOUD_SECRET_KEY=test-secret-key",
        "TENCENTCLOUD_REGION=ap-shanghai"
      ].join("\n"),
      "utf8"
    );

    try {
      await utimes(nodeModulesLockPath, new Date(0), new Date(0));

      const result = spawnSync("bash", [scriptPath, "get"], {
        env: {
          ...process.env,
          APM_TRACE_ENV_FILE: envFile,
          PATH: `${binDir}:${tempDir}:${process.env.PATH ?? ""}`,
          HOME: process.env.HOME ?? ""
        },
        encoding: "utf8"
      });

      expect(result.status).toBe(1);
      const installLog = await readFile(installCaptureFile, "utf8");
      expect(installLog).toContain("install --prefix");
      expect(JSON.parse(result.stdout)).toEqual({
        ok: false,
        error: {
          code: "CLI_USAGE_ERROR",
          message: "required option '--trace-id <traceId>' not specified"
        }
      });
    } finally {
      await utimes(nodeModulesLockPath, originalNodeModulesLockStat.atime, originalNodeModulesLockStat.mtime);
    }
  });
});
