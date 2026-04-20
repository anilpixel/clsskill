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
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const runScriptPath = "/Users/eziosnone/Github/clsskill/scripts/clscli-run.sh";
const envScriptPath = "/Users/eziosnone/Github/clsskill/scripts/clscli-env.sh";

describe("clscli-env.sh", () => {
  it("--env-file 会直接返回配置文件路径，不会被本地配置缺失阻塞", () => {
    const envFile = join("/tmp", `clscli-env-${Date.now()}.local`);

    const result = spawnSync("bash", [envScriptPath, "--env-file"], {
      env: {
        ...process.env,
        CLSCLI_ENV_FILE: envFile,
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? ""
      },
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.trim()).toBe(envFile);
  });

  it("--help 在缺少 node 和配置文件时也能直接显示帮助", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "clscli-help-"));
    const binDir = join(tempDir, "bin");
    await mkdir(binDir);
    await symlink("/bin/bash", join(binDir, "bash"));
    await symlink("/bin/cat", join(binDir, "cat"));
    await symlink("/usr/bin/dirname", join(binDir, "dirname"));

    const result = spawnSync("bash", [envScriptPath, "--help"], {
      env: {
        ...process.env,
        CLSCLI_ENV_FILE: join(tempDir, "missing.local"),
        PATH: binDir,
        HOME: process.env.HOME ?? ""
      },
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("用法：");
    expect(result.stdout).toContain("scripts/clscli-env.sh --check");
  });

  it("--export-sh 在缺少 node 时仍能导出本地配置", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "clscli-env-"));
    const binDir = join(tempDir, "bin");
    const envFile = join(tempDir, ".env.test.local");

    await mkdir(binDir);
    await symlink("/bin/bash", join(binDir, "bash"));
    await symlink("/bin/cat", join(binDir, "cat"));
    await symlink("/usr/bin/dirname", join(binDir, "dirname"));

    await writeFile(
      envFile,
      [
        "TENCENTCLOUD_SECRET_ID=test-secret-id",
        "TENCENTCLOUD_SECRET_KEY=test-secret-key",
        "TENCENTCLOUD_REGION=ap-shanghai"
      ].join("\n"),
      "utf8"
    );

    const result = spawnSync("bash", [envScriptPath, "--export-sh"], {
      env: {
        ...process.env,
        CLSCLI_ENV_FILE: envFile,
        PATH: binDir,
        HOME: process.env.HOME ?? ""
      },
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("export TENCENTCLOUD_SECRET_ID=");
    expect(result.stdout).toContain("export TENCENTCLOUD_SECRET_KEY=");
    expect(result.stdout).toContain("export TENCENTCLOUD_REGION=");
  });
});

describe("clscli-run.sh", () => {
  it("--help 在缺少配置文件时也应直接输出帮助，不污染 stderr", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "clscli-run-help-"));
    const missingEnvFile = join(tempDir, "missing.local");

    const result = spawnSync("bash", [runScriptPath, "--help"], {
      env: {
        ...process.env,
        CLSCLI_ENV_FILE: missingEnvFile,
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? ""
      },
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Usage: cls-query");
    expect(result.stdout).toContain("腾讯云 CLS 日志查询工具");
  });

  it("会转交给仓库内的 Node CLI，而不是外部 clscli 二进制", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "clscli-run-"));
    const envFile = join(tempDir, ".env.test.local");
    const captureFile = join(tempDir, "node-args.txt");
    const fakeNodePath = join(tempDir, "node");
    const fakeNpmPath = join(tempDir, "npm");

    await writeFile(
      fakeNodePath,
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        `printf '%s\\n' "$*" > "${captureFile}"`,
        "cat <<'EOF'",
        "{",
        '  "ok": true,',
        '  "command": "context",',
        '  "request": {',
        '    "TopicId": "topic-1",',
        '    "BTime": "2024-07-03 12:34:56.789",',
        '    "PkgId": "pkg-1",',
        '    "PkgLogId": 65536',
        "  },",
        '  "data": {',
        '    "items": [],',
        '    "prevOver": true,',
        '    "nextOver": false,',
        '    "requestId": "request-1"',
        "  }",
        "}",
        "EOF"
      ].join("\n"),
      "utf8"
    );
    await chmod(fakeNodePath, 0o755);

    await writeFile(
      fakeNpmPath,
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
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

    const result = spawnSync("bash", [runScriptPath, "context", "pkg-1", "65536", "--topic", "topic-1", "--btime", "2024-07-03 12:34:56.789"], {
      env: {
        ...process.env,
        CLSCLI_ENV_FILE: envFile,
        PATH: `${tempDir}:${process.env.PATH ?? ""}`,
        HOME: process.env.HOME ?? ""
      },
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toEqual({
      ok: true,
      command: "context",
      request: {
        TopicId: "topic-1",
        BTime: "2024-07-03 12:34:56.789",
        PkgId: "pkg-1",
        PkgLogId: 65536
      },
      data: {
        items: [],
        prevOver: true,
      nextOver: false,
      requestId: "request-1"
      }
    });
    expect(await readFile(captureFile, "utf8")).toContain(
      "tools/cls-query-cli/dist/cli.js context pkg-1 65536 --topic topic-1 --btime 2024-07-03 12:34:56.789"
    );
  });

  it("当源码比 dist 更新时会重新执行 build", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "clscli-rebuild-"));
    const envFile = join(tempDir, ".env.test.local");
    const buildCaptureFile = join(tempDir, "build-args.txt");
    const fakeNodePath = join(tempDir, "node");
    const fakeNpmPath = join(tempDir, "npm");
    const binDir = join(tempDir, "bin");
    const distPath = "/Users/eziosnone/Github/clsskill/tools/cls-query-cli/dist/cli.js";
    const originalDistStat = await stat(distPath);

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
        '{"ok":true,"command":"context","request":{"TopicId":"topic-1","BTime":"2024-07-03 12:34:56.789","PkgId":"pkg-1","PkgLogId":65536},"data":{"items":[],"prevOver":true,"nextOver":false,"requestId":"request-1"}}',
        "EOF"
      ].join("\n"),
      "utf8"
    );
    await chmod(fakeNodePath, 0o755);

    await writeFile(
      fakeNpmPath,
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        `printf '%s\\n' "$*" > "${buildCaptureFile}"`,
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
      await utimes(distPath, new Date(0), new Date(0));

      const result = spawnSync("bash", [runScriptPath, "context", "pkg-1", "65536", "--topic", "topic-1", "--btime", "2024-07-03 12:34:56.789"], {
        env: {
          ...process.env,
          CLSCLI_ENV_FILE: envFile,
          PATH: `${binDir}:${tempDir}:${process.env.PATH ?? ""}`,
          HOME: process.env.HOME ?? ""
        },
        encoding: "utf8"
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      expect(await readFile(buildCaptureFile, "utf8")).toContain("run --prefix");
      expect(await readFile(buildCaptureFile, "utf8")).toContain("build");
      expect(JSON.parse(result.stdout)).toEqual({
        ok: true,
        command: "context",
        request: {
          TopicId: "topic-1",
          BTime: "2024-07-03 12:34:56.789",
          PkgId: "pkg-1",
          PkgLogId: 65536
        },
        data: {
          items: [],
          prevOver: true,
          nextOver: false,
          requestId: "request-1"
        }
      });
    } finally {
      await utimes(distPath, originalDistStat.atime, originalDistStat.mtime);
    }
  });
});
