# Node 化 CLS / APM CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用仓库内两个独立的 Node CLI 完整替换现有的 CLS 外部 `clscli` 依赖，并保留现有脚本入口与 APM Node CLI 能力。

**Architecture:** 新增 `tools/cls-query-cli`，结构对齐现有 `tools/apm-trace-cli`；`scripts/clscli-run.sh` 从调用外部 `clscli` 改为调用仓库内构建产物；`SKILL.md`、配置脚本和环境校验脚本同步移除 Homebrew 与绝对路径叙述。CLS 与 APM 保持两个边界清晰的 Node CLI，仅共享配置文件和脚本包装方式。

**Tech Stack:** TypeScript、Node.js、`commander`、`vitest`、`tencentcloud-sdk-nodejs-cls`、现有 Bash 包装脚本

---

## 文件结构

- Create: `tools/cls-query-cli/package.json`
- Create: `tools/cls-query-cli/tsconfig.json`
- Create: `tools/cls-query-cli/vitest.config.ts`
- Create: `tools/cls-query-cli/src/cli.ts`
- Create: `tools/cls-query-cli/src/cli-runner.ts`
- Create: `tools/cls-query-cli/src/config.ts`
- Create: `tools/cls-query-cli/src/sdk-client.ts`
- Create: `tools/cls-query-cli/src/cls-client.ts`
- Create: `tools/cls-query-cli/src/types.ts`
- Create: `tools/cls-query-cli/src/commands/topics.ts`
- Create: `tools/cls-query-cli/src/commands/query.ts`
- Create: `tools/cls-query-cli/src/commands/context.ts`
- Create: `tools/cls-query-cli/src/domain/time-range.ts`
- Create: `tools/cls-query-cli/src/domain/topic-filters.ts`
- Create: `tools/cls-query-cli/src/domain/query-request.ts`
- Create: `tools/cls-query-cli/src/domain/context-request.ts`
- Create: `tools/cls-query-cli/src/domain/output.ts`
- Create: `tools/cls-query-cli/src/gateways/topics-gateway.ts`
- Create: `tools/cls-query-cli/src/gateways/query-gateway.ts`
- Create: `tools/cls-query-cli/src/gateways/context-gateway.ts`
- Create: `tools/cls-query-cli/tests/cli-runner.test.ts`
- Create: `tools/cls-query-cli/tests/time-range.test.ts`
- Create: `tools/cls-query-cli/tests/topic-filters.test.ts`
- Create: `tools/cls-query-cli/tests/query-request.test.ts`
- Create: `tools/cls-query-cli/tests/output.test.ts`
- Create: `tools/cls-query-cli/tests/topics-command.test.ts`
- Create: `tools/cls-query-cli/tests/query-command.test.ts`
- Create: `tools/cls-query-cli/tests/context-command.test.ts`
- Create: `tools/cls-query-cli/tests/query-gateway.test.ts`
- Create: `tools/cls-query-cli/tests/clscli-run-script.test.ts`
- Modify: `scripts/clscli-run.sh`
- Modify: `scripts/clscli-env.sh`
- Modify: `scripts/clscli-config.sh`
- Modify: `scripts/apm-trace-config.sh`
- Modify: `SKILL.md`
- Modify: `.env.clscli.local.example`
- Modify: `.gitignore`

## Task 1: 搭建 CLS Node CLI 骨架与基础契约

**Files:**
- Create: `tools/cls-query-cli/package.json`
- Create: `tools/cls-query-cli/tsconfig.json`
- Create: `tools/cls-query-cli/vitest.config.ts`
- Create: `tools/cls-query-cli/src/cli.ts`
- Create: `tools/cls-query-cli/src/cli-runner.ts`
- Create: `tools/cls-query-cli/src/config.ts`
- Create: `tools/cls-query-cli/src/sdk-client.ts`
- Create: `tools/cls-query-cli/src/cls-client.ts`
- Create: `tools/cls-query-cli/src/types.ts`
- Test: `tools/cls-query-cli/tests/cli-runner.test.ts`

- [ ] **Step 1: 写失败测试，固定 CLI 基础错误契约**

```ts
import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli-runner.js";

describe("runCli", () => {
  it("参数缺失时返回结构化 JSON 错误", async () => {
    const outputs: string[] = [];

    const exitCode = await runCli(["node", "cls-query", "context"], {
      writeJson(value) {
        outputs.push(JSON.stringify(value));
      },
      createClient() {
        throw new Error("不应创建 client");
      }
    });

    expect(exitCode).toBe(1);
    expect(JSON.parse(outputs[0])).toEqual({
      ok: false,
      error: {
        code: "CLI_USAGE_ERROR",
        message: "missing required argument 'PkgId'"
      }
    });
  });
});
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run: `npm test -- tests/cli-runner.test.ts`  
Expected: FAIL，提示 `runCli` 或 `../src/cli-runner.js` 不存在

- [ ] **Step 3: 写最小实现，建立包结构与基础错误模型**

```ts
export interface CLSAppConfig {
  secretId: string;
  secretKey: string;
  region?: string;
}

export interface CommandErrorShape {
  ok: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export class CliError extends Error {
  constructor(
    public code: string,
    message: string,
    public requestId?: string
  ) {
    super(message);
    this.name = "CliError";
  }
}
```

```ts
import { Command, CommanderError } from "commander";

const COMMANDER_HELP_DISPLAYED = "commander.helpDisplayed";

export async function runCli(argv: string[], deps = {}): Promise<number> {
  const program = new Command();
  program
    .name("cls-query")
    .exitOverride()
    .configureOutput({ writeErr: () => {} });

  program.command("topics");
  program.command("query");
  program.command("context").argument("<PkgId>").argument("<PkgLogId>");

  try {
    await program.parseAsync(argv);
    return 0;
  } catch (error: unknown) {
    if (error instanceof CommanderError && error.code === COMMANDER_HELP_DISPLAYED) {
      return 0;
    }
    const shape = error instanceof CommanderError
      ? { ok: false, error: { code: "CLI_USAGE_ERROR", message: error.message.replace(/^error:\\s*/u, "") } }
      : { ok: false, error: { code: "UNEXPECTED_ERROR", message: error instanceof Error ? error.message : "未知错误" } };
    const writeJson = (deps as { writeJson?: (value: unknown) => void }).writeJson ?? ((value: unknown) => {
      process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    });
    writeJson(shape);
    return 1;
  }
}
```

- [ ] **Step 4: 声明包依赖与构建脚本**

```json
{
  "name": "@clsskill/cls-query-cli",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "cls-query": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "commander": "^13.1.0",
    "tencentcloud-sdk-nodejs-cls": "^4.1.216"
  },
  "devDependencies": {
    "@types/node": "^22.15.3",
    "typescript": "^5.8.3",
    "vitest": "^3.1.2"
  }
}
```

- [ ] **Step 5: 运行测试确认转绿**

Run: `npm test -- tests/cli-runner.test.ts`  
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add tools/cls-query-cli
git commit -m "feat: scaffold node cls query cli"
```

## Task 2: 实现共享配置、时间范围与输出模型

**Files:**
- Create: `tools/cls-query-cli/src/domain/time-range.ts`
- Create: `tools/cls-query-cli/src/domain/output.ts`
- Create: `tools/cls-query-cli/tests/time-range.test.ts`
- Create: `tools/cls-query-cli/tests/output.test.ts`
- Modify: `tools/cls-query-cli/src/types.ts`
- Modify: `tools/cls-query-cli/src/config.ts`

- [ ] **Step 1: 写失败测试，固定时间范围与输出规则**

```ts
import { describe, expect, it } from "vitest";
import { resolveTimeRange } from "../src/domain/time-range.js";

describe("resolveTimeRange", () => {
  it("支持 --last 生成秒级时间范围", () => {
    const range = resolveTimeRange({ last: "15m", now: new Date("2026-04-17T12:00:00Z") });
    expect(range.startTime).toBe(1763399100);
    expect(range.endTime).toBe(1763400000);
  });
});
```

```ts
import { describe, expect, it } from "vitest";
import { renderOutput } from "../src/domain/output.js";

describe("renderOutput", () => {
  it("默认输出 JSON", () => {
    const result = renderOutput({ ok: true, data: [{ TopicId: "abc" }] }, undefined);
    expect(result.kind).toBe("stdout");
    expect(result.content).toContain("\"TopicId\": \"abc\"");
  });
});
```

- [ ] **Step 2: 运行测试，确认失败原因正确**

Run: `npm test -- tests/time-range.test.ts tests/output.test.ts`  
Expected: FAIL，提示 `resolveTimeRange` / `renderOutput` 不存在

- [ ] **Step 3: 写最小实现**

```ts
export interface ResolveTimeRangeInput {
  last?: string;
  from?: number;
  to?: number;
  now?: Date;
}

export interface ResolvedTimeRange {
  startTime: number;
  endTime: number;
}
```

```ts
export function resolveTimeRange(input: ResolveTimeRangeInput): ResolvedTimeRange {
  if (input.last) {
    const now = Math.floor((input.now ?? new Date()).getTime() / 1000);
    const matched = input.last.match(/^(\d+)([mh])$/u);
    if (!matched) {
      throw new Error("不支持的时间范围");
    }
    const amount = Number.parseInt(matched[1], 10);
    const seconds = matched[2] === "h" ? amount * 3600 : amount * 60;
    return { startTime: now - seconds, endTime: now };
  }

  if (typeof input.from === "number" && typeof input.to === "number") {
    return {
      startTime: Math.floor(input.from / 1000),
      endTime: Math.floor(input.to / 1000)
    };
  }

  throw new Error("缺少时间范围");
}
```

```ts
export function renderOutput(data: unknown, output?: string): { kind: "stdout" | "file"; content: string; path?: string } {
  const json = `${JSON.stringify(data, null, 2)}\n`;
  if (!output || output === "json") {
    return { kind: "stdout", content: json };
  }
  if (output === "csv") {
    const rows = Array.isArray(data) ? data : [data];
    const keys = rows.length > 0 && typeof rows[0] === "object" && rows[0] !== null
      ? Object.keys(rows[0] as Record<string, unknown>)
      : [];
    const lines = [
      keys.join(","),
      ...rows.map((row) => keys.map((key) => JSON.stringify((row as Record<string, unknown>)[key] ?? "")).join(","))
    ];
    return { kind: "stdout", content: `${lines.join("\n")}\n` };
  }
  return { kind: "file", content: json, path: output };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/time-range.test.ts tests/output.test.ts`  
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add tools/cls-query-cli/src tools/cls-query-cli/tests
git commit -m "feat: add cls cli shared config and output primitives"
```

## Task 3: 实现 `topics` 命令与主题查询网关

**Files:**
- Create: `tools/cls-query-cli/src/commands/topics.ts`
- Create: `tools/cls-query-cli/src/domain/topic-filters.ts`
- Create: `tools/cls-query-cli/src/gateways/topics-gateway.ts`
- Create: `tools/cls-query-cli/tests/topic-filters.test.ts`
- Create: `tools/cls-query-cli/tests/topics-command.test.ts`
- Modify: `tools/cls-query-cli/src/cli-runner.ts`
- Modify: `tools/cls-query-cli/src/cls-client.ts`
- Modify: `tools/cls-query-cli/src/sdk-client.ts`

- [ ] **Step 1: 写失败测试，固定 `topics` 请求与响应契约**

```ts
import { describe, expect, it } from "vitest";
import { runTopicsCommand } from "../src/commands/topics.js";

describe("runTopicsCommand", () => {
  it("把命令参数映射为 DescribeTopics 请求", async () => {
    const calls: unknown[] = [];
    const client = {
      async describeTopics(request: unknown) {
        calls.push(request);
        return { TotalCount: 1, Topics: [{ TopicId: "topic-1", TopicName: "app-log" }] };
      }
    };

    const result = await runTopicsCommand(client, {
      region: "ap-shanghai",
      topicName: "app",
      limit: 20,
      offset: 0
    });

    expect(calls[0]).toEqual({
      Filters: [{ Key: "topicName", Values: ["app"] }],
      Limit: 20,
      Offset: 0
    });
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- tests/topic-filters.test.ts tests/topics-command.test.ts`  
Expected: FAIL，提示命令或过滤器构造函数不存在

- [ ] **Step 3: 写最小实现**

```ts
export function buildTopicFilters(input: {
  topicName?: string;
  logsetName?: string;
  logsetId?: string;
}): Array<{ Key: string; Values: string[] }> {
  const filters: Array<{ Key: string; Values: string[] }> = [];
  if (input.topicName) filters.push({ Key: "topicName", Values: [input.topicName] });
  if (input.logsetName) filters.push({ Key: "logsetName", Values: [input.logsetName] });
  if (input.logsetId) filters.push({ Key: "logsetId", Values: [input.logsetId] });
  return filters;
}
```

```ts
export async function runTopicsCommand(client: CLSClient, options: TopicsOptions) {
  const request = {
    Filters: buildTopicFilters(options),
    Limit: options.limit ?? 20,
    Offset: options.offset ?? 0
  };

  const response = await client.describeTopics(request, options.region);
  return {
    ok: true,
    command: "topics",
    request,
    data: {
      totalCount: response.TotalCount ?? 0,
      items: response.Topics ?? []
    }
  };
}
```

- [ ] **Step 4: 在 `cli-runner.ts` 中注册 `topics` 参数**

```ts
program
  .command("topics")
  .option("--region <region>", "CLS 地域")
  .option("--topic-name <topicName>", "按 topic 名过滤")
  .option("--logset-name <logsetName>", "按日志集名过滤")
  .option("--logset-id <logsetId>", "按日志集 ID 过滤")
  .option("--limit <number>", "单页大小", (value) => Number.parseInt(value, 10))
  .option("--offset <number>", "分页偏移", (value) => Number.parseInt(value, 10))
  .action(async (options) => {
    deps.writeJson(await runTopicsCommand(deps.createClient(), options));
  });
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- tests/topic-filters.test.ts tests/topics-command.test.ts`  
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add tools/cls-query-cli/src tools/cls-query-cli/tests
git commit -m "feat: add cls topics command"
```

## Task 4: 实现 `query` 命令、时间范围映射、自动翻页与导出

**Files:**
- Create: `tools/cls-query-cli/src/commands/query.ts`
- Create: `tools/cls-query-cli/src/domain/query-request.ts`
- Create: `tools/cls-query-cli/src/gateways/query-gateway.ts`
- Create: `tools/cls-query-cli/tests/query-request.test.ts`
- Create: `tools/cls-query-cli/tests/query-command.test.ts`
- Create: `tools/cls-query-cli/tests/query-gateway.test.ts`
- Modify: `tools/cls-query-cli/src/domain/output.ts`
- Modify: `tools/cls-query-cli/src/cli-runner.ts`

- [ ] **Step 1: 写失败测试，固定查询请求与自动翻页语义**

```ts
import { describe, expect, it } from "vitest";
import { runQueryCommand } from "../src/commands/query.js";

describe("runQueryCommand", () => {
  it("在 max 大于单页大小时自动翻页聚合结果", async () => {
    let callCount = 0;
    const client = {
      async searchLog() {
        callCount += 1;
        if (callCount === 1) {
          return {
            Results: [{ Content: "a" }],
            Analysis: false,
            ListOver: false,
            Context: "cursor-1"
          };
        }
        return {
          Results: [{ Content: "b" }],
          Analysis: false,
          ListOver: true,
          Context: "cursor-2"
        };
      }
    };

    const result = await runQueryCommand(client, {
      region: "ap-shanghai",
      query: "*",
      topic: "topic-1",
      last: "15m",
      limit: 1,
      max: 2
    });

    expect(callCount).toBe(2);
    expect(result.data.items).toHaveLength(2);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- tests/query-request.test.ts tests/query-command.test.ts tests/query-gateway.test.ts`  
Expected: FAIL

- [ ] **Step 3: 写请求构造与分页最小实现**

```ts
export function buildSearchLogRequest(input: QueryRequestInput) {
  const range = resolveTimeRange({
    last: input.last,
    from: input.from,
    to: input.to
  });

  return {
    TopicIds: input.topics,
    Query: input.query,
    From: range.startTime,
    To: range.endTime,
    Limit: input.limit ?? 100,
    Sort: input.sort ?? "desc",
    Context: input.context
  };
}
```

```ts
export async function collectSearchLogs(client: CLSClient, request: SearchLogRequest, max: number) {
  const items: unknown[] = [];
  let nextContext = request.Context;
  let listOver = false;

  while (!listOver && (max === 0 || items.length < max)) {
    const response = await client.searchLog({ ...request, Context: nextContext });
    items.push(...(response.Results ?? []));
    listOver = Boolean(response.ListOver);
    nextContext = response.Context;
    if (max === 0) break;
  }

  return {
    items: max > 0 ? items.slice(0, max) : items,
    context: nextContext,
    listOver
  };
}
```

- [ ] **Step 4: 扩展输出层，支持 CSV 与文件落盘**

```ts
import { writeFile } from "node:fs/promises";

export async function emitOutput(result: RenderedOutput): Promise<void> {
  if (result.kind === "stdout") {
    process.stdout.write(result.content);
    return;
  }

  await writeFile(result.path, result.content, "utf8");
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- tests/query-request.test.ts tests/query-command.test.ts tests/query-gateway.test.ts`  
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add tools/cls-query-cli/src tools/cls-query-cli/tests
git commit -m "feat: add cls query command"
```

## Task 5: 实现 `context` 命令并切换脚本入口到 Node CLI

**Files:**
- Create: `tools/cls-query-cli/src/commands/context.ts`
- Create: `tools/cls-query-cli/src/domain/context-request.ts`
- Create: `tools/cls-query-cli/src/gateways/context-gateway.ts`
- Create: `tools/cls-query-cli/tests/context-command.test.ts`
- Create: `tools/cls-query-cli/tests/clscli-run-script.test.ts`
- Modify: `tools/cls-query-cli/src/cli-runner.ts`
- Modify: `scripts/clscli-run.sh`
- Modify: `scripts/clscli-env.sh`
- Modify: `scripts/clscli-config.sh`

- [ ] **Step 1: 写失败测试，固定 `context` 命令与脚本切换行为**

```ts
import { describe, expect, it } from "vitest";
import { runContextCommand } from "../src/commands/context.js";

describe("runContextCommand", () => {
  it("把 PkgId 与 PkgLogId 映射为 DescribeLogContext 请求", async () => {
    const client = {
      async describeLogContext(request: unknown) {
        return { Logs: [{ PkgId: "pkg-1", PkgLogId: 1 }], request };
      }
    };

    const result = await runContextCommand(client, {
      pkgId: "pkg-1",
      pkgLogId: 1,
      topic: "topic-1",
      region: "ap-shanghai"
    });

    expect(result.request).toEqual({
      TopicId: "topic-1",
      BTime: undefined,
      ETime: undefined,
      PkgId: "pkg-1",
      PkgLogId: 1
    });
  });
});
```

```ts
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";

describe("clscli-run.sh", () => {
  it("缺少参数时返回 Node CLI 的 JSON 错误，而不是调用外部 clscli", () => {
    const result = spawnSync("bash", ["scripts/clscli-run.sh", "context"], {
      cwd: "/Users/eziosnone/Github/clsskill",
      encoding: "utf8"
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("\"CLI_USAGE_ERROR\"");
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- tests/context-command.test.ts tests/clscli-run-script.test.ts`  
Expected: FAIL

- [ ] **Step 3: 写最小实现**

```ts
export async function runContextCommand(client: CLSClient, options: ContextOptions) {
  const request = {
    TopicId: options.topic,
    BTime: options.from,
    ETime: options.to,
    PkgId: options.pkgId,
    PkgLogId: Number.parseInt(String(options.pkgLogId), 10)
  };

  const response = await client.describeLogContext(request, options.region);
  return {
    ok: true,
    command: "context",
    request,
    data: {
      items: response.Logs ?? []
    }
  };
}
```

```bash
if [[ ! -d "${TOOL_DIR}/node_modules" ]]; then
  npm install --prefix "${TOOL_DIR}" >/dev/null
fi

if [[ ! -f "${TOOL_DIR}/dist/cli.js" ]]; then
  npm run --prefix "${TOOL_DIR}" build >/dev/null
fi

exec node "${TOOL_DIR}/dist/cli.js" "$@"
```

- [ ] **Step 4: 清理 `clscli-env.sh` 的外部二进制依赖**

```bash
if [[ "${MODE}" == "--env-file" ]]; then
  echo "${ENV_FILE}"
  exit 0
fi

if ! command -v node >/dev/null 2>&1 && [[ "${MODE}" == "--check" ]]; then
  echo "未检测到 node，请先安装 Node.js。" >&2
  exit 1
fi
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- tests/context-command.test.ts tests/clscli-run-script.test.ts`  
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add tools/cls-query-cli/src tools/cls-query-cli/tests scripts/clscli-run.sh scripts/clscli-env.sh scripts/clscli-config.sh
git commit -m "feat: switch cls wrapper to node cli"
```

## Task 6: 清理技能文档、示例配置与 APM 相关文案

**Files:**
- Modify: `SKILL.md`
- Modify: `.env.clscli.local.example`
- Modify: `.gitignore`
- Modify: `scripts/apm-trace-config.sh`

- [ ] **Step 1: 写失败测试或检查点，固定文档约束**

```bash
rg -n "/Users/eziosnone|brew tap|brew install dbwang0130/clscli|metadata:\\n  requires:\\n    bin:\\n      - clscli" SKILL.md scripts
```

Expected: 当前应匹配到旧的绝对路径和 Homebrew 叙述

- [ ] **Step 2: 重写 `SKILL.md` 的前半部分**

```md
---
name: clscli
description: 当需要查询、筛选、统计或排查腾讯云 CLS 日志、腾讯云 APM 调用链时使用。
---

# CLS / APM 查询技能

- 本地凭证文件：`.env.clscli.local`
- CLS 查询入口：`scripts/clscli-run.sh`
- CLS 配置入口：`scripts/clscli-config.sh`
- APM 查询入口：`scripts/apm-trace-run.sh`
- APM 配置入口：`scripts/apm-trace-config.sh`

安装说明：

- 不要求单独安装 Homebrew `clscli`
- 仓库内脚本会自动安装并构建对应的 Node CLI
```

- [ ] **Step 3: 清理脚本帮助文本中的绝对路径**

```bash
说明：
  该脚本会把腾讯云 CLS 凭证写入 skill 目录下的本地配置文件。
  默认写入：.env.clscli.local
```

- [ ] **Step 4: 更新示例配置与忽略规则**

```env
TENCENTCLOUD_SECRET_ID=
TENCENTCLOUD_SECRET_KEY=
TENCENTCLOUD_REGION=ap-shanghai
TENCENTCLOUD_APM_INSTANCE_ID=
TENCENTCLOUD_APM_BUSINESS_NAME=
```

```gitignore
tools/*/dist
tools/*/node_modules
```

- [ ] **Step 5: 运行检查确认无残留**

Run: `rg -n "/Users/eziosnone|brew tap|brew install dbwang0130/clscli" SKILL.md scripts`  
Expected: 无输出

- [ ] **Step 6: 提交**

```bash
git add SKILL.md .env.clscli.local.example .gitignore scripts/apm-trace-config.sh
git commit -m "docs: remove homebrew clscli assumptions"
```

## Task 7: 全量验证与真实联调验收

**Files:**
- Modify: `tools/cls-query-cli/tests/*`
- Modify: `tools/apm-trace-cli/tests/*`
- Verify: `scripts/clscli-run.sh`
- Verify: `scripts/apm-trace-run.sh`

- [ ] **Step 1: 运行 CLS 单元测试**

Run: `npm test --prefix tools/cls-query-cli`  
Expected: PASS

- [ ] **Step 2: 运行 APM 单元测试，确认没有被文档与脚本变更破坏**

Run: `npm test --prefix tools/apm-trace-cli`  
Expected: PASS

- [ ] **Step 3: 运行两个工具的构建**

Run: `npm run build --prefix tools/cls-query-cli`  
Expected: PASS

Run: `npm run build --prefix tools/apm-trace-cli`  
Expected: PASS

- [ ] **Step 4: 验证帮助命令与参数错误契约**

Run: `scripts/clscli-run.sh --help`  
Expected: 帮助文本，退出码 `0`

Run: `scripts/clscli-run.sh context`  
Expected: JSON 错误，退出码 `1`

Run: `scripts/apm-trace-run.sh --help`  
Expected: 帮助文本，退出码 `0`

- [ ] **Step 5: 做一轮真实腾讯云联调**

Run: `scripts/clscli-run.sh topics --region ap-shanghai --limit 5 --output json`  
Expected: 返回结构化 JSON

Run: `scripts/apm-trace-run.sh instances`  
Expected: 返回结构化 JSON

如果 CLS 能拿到 topic，再继续：

Run: `scripts/clscli-run.sh query --region ap-shanghai -t <TopicId> --last 15m -q "*"`

- [ ] **Step 6: 最终提交**

```bash
git add tools/cls-query-cli tools/apm-trace-cli scripts SKILL.md .env.clscli.local.example .gitignore docs/superpowers/specs/2026-04-17-node-cls-apm-cli-design.md docs/superpowers/plans/2026-04-17-node-cls-apm-cli.md
git commit -m "feat: replace clscli with internal node clis"
```

## Self-Review

- Spec 覆盖：计划包含 CLS Node CLI、新旧脚本切换、文档去 Homebrew/绝对路径、APM 回归验证
- 命令面覆盖检查：实现阶段必须先用 `clscli --help` 和必要子命令帮助补齐 Go 版命令范围，再落代码
- 类型一致性：CLS CLI 与 APM CLI 统一使用结构化 JSON 成功/错误模型，避免后续类型命名漂移
