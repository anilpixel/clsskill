import { Command, CommanderError, Option } from "commander";
import { APMClient } from "./apm-client.js";
import { runGetCommand } from "./commands/get.js";
import { runInstancesCommand } from "./commands/instances.js";
import { runRawCommand } from "./commands/raw.js";
import { runSearchCommand } from "./commands/search.js";
import { CliError, loadConfig } from "./config.js";
import type { CommandErrorShape } from "./types.js";

export interface RunCliDependencies {
  writeJson?: (value: unknown) => void;
  createClient?: () => APMClient;
}

const COMMANDER_HELP_DISPLAYED = "commander.helpDisplayed";

function defaultWriteJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function normalizeCommanderMessage(message: string): string {
  return message.replace(/^error:\s*/u, "");
}

function createSourceOption(): Option {
  return new Option("--source <source>", "数据源").choices(["apm", "otel"]).default("apm");
}

function toErrorShape(error: unknown): CommandErrorShape {
  if (error instanceof CommanderError) {
    return {
      ok: false,
      error: {
        code: "CLI_USAGE_ERROR",
        message: normalizeCommanderMessage(error.message)
      }
    };
  }

  if (error instanceof CliError) {
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        requestId: error.requestId
      }
    };
  }

  if (error instanceof Error) {
    return {
      ok: false,
      error: {
        code: "UNEXPECTED_ERROR",
        message: error.message
      }
    };
  }

  return {
    ok: false,
    error: {
      code: "UNEXPECTED_ERROR",
      message: "未知错误"
    }
  };
}

function createProgram(deps: Required<RunCliDependencies>): Command {
  const program = new Command();

  program
    .name("apm-trace")
    .description("腾讯云 APM 调用链查询工具")
    .exitOverride()
    .configureOutput({
      writeErr: () => {
        // 参数错误统一输出 JSON，不输出 commander 的纯文本 stderr。
      }
    });

  program
    .command("search")
    .description("按条件查询调用链")
    .addOption(createSourceOption())
    .option("--instance-id <instanceId>", "显式指定 APM 实例 ID")
    .option("--business-name <businessName>", "显式指定 BusinessName")
    .option("--trace-id <traceId>", "按 traceId 过滤")
    .option("--service <service>", "按服务名过滤")
    .option("--span-id <spanId>", "按 spanId 过滤")
    .option("--operation <operation>", "按操作名过滤")
    .option("--filter <expr>", "附加过滤器，格式 key:type:value", (value, previous: string[]) => {
      return [...previous, value];
    }, [])
    .option("--last <window>", "相对时间窗口，例如 15m")
    .option("--start <time>", "绝对开始时间，支持秒级时间戳或 ISO 时间")
    .option("--end <time>", "绝对结束时间，支持秒级时间戳或 ISO 时间")
    .option("--limit <number>", "单页大小", (value) => Number.parseInt(value, 10))
    .option("--offset <number>", "分页偏移量", (value) => Number.parseInt(value, 10))
    .addOption(new Option("--sort-key <key>", "排序字段").choices(["startTime", "endTime", "duration"]))
    .addOption(new Option("--sort-order <order>", "排序方向").choices(["asc", "desc"]))
    .action(async (options) => {
      deps.writeJson(await runSearchCommand(deps.createClient(), options));
    });

  program
    .command("get")
    .description("按 traceId 获取单条调用链")
    .requiredOption("--trace-id <traceId>", "traceId")
    .addOption(createSourceOption())
    .option("--instance-id <instanceId>", "显式指定 APM 实例 ID")
    .option("--business-name <businessName>", "显式指定 BusinessName")
    .option("--last <window>", "相对时间窗口，例如 15m")
    .option("--start <time>", "绝对开始时间，支持秒级时间戳或 ISO 时间")
    .option("--end <time>", "绝对结束时间，支持秒级时间戳或 ISO 时间")
    .option("--limit <number>", "单次请求大小", (value) => Number.parseInt(value, 10))
    .action(async (options) => {
      deps.writeJson(await runGetCommand(deps.createClient(), options));
    });

  program
    .command("instances")
    .description("列出当前地域下可见的 APM 实例")
    .addOption(createSourceOption())
    .action(async (options) => {
      deps.writeJson(await runInstancesCommand(deps.createClient(), options));
    });

  program
    .command("raw")
    .description("透传原生查询请求")
    .addOption(createSourceOption())
    .option("--instance-id <instanceId>", "显式指定 APM 实例 ID")
    .option("--business-name <businessName>", "显式指定 BusinessName")
    .option("--request-json <json>", "原始 JSON 请求体")
    .option("--request-file <path>", "原始 JSON 文件路径")
    .action(async (options) => {
      deps.writeJson(await runRawCommand(deps.createClient(), options));
    });

  return program;
}

export async function runCli(argv: string[], deps: RunCliDependencies = {}): Promise<number> {
  const resolvedDeps: Required<RunCliDependencies> = {
    writeJson: deps.writeJson ?? defaultWriteJson,
    createClient: deps.createClient ?? (() => new APMClient(loadConfig()))
  };

  try {
    const program = createProgram(resolvedDeps);
    await program.parseAsync(argv);
    return 0;
  } catch (error: unknown) {
    if (error instanceof CommanderError && error.code === COMMANDER_HELP_DISPLAYED) {
      return 0;
    }
    resolvedDeps.writeJson(toErrorShape(error));
    return 1;
  }
}
