import { InvalidArgumentError, type Command } from "commander";
import type { ClsClient } from "../cls-client.js";
import { resolveContextRequest, type ContextRequestInput } from "../domain/context-request.js";
import type { CommandSuccessShape } from "../types.js";
import type { DescribeLogContextResponse } from "tencentcloud-sdk-nodejs-cls/tencentcloud/services/cls/v20201016/cls_models.js";

export interface ContextCommandOptions extends ContextRequestInput {
  region?: string;
}

export interface ContextCommandData {
  items: Array<Record<string, unknown>>;
  prevOver: boolean;
  nextOver: boolean;
  requestId: string | null;
}

export interface RunContextCommandDependencies {
  createClient: (config?: { region?: string }) => ClsClient;
}

function parseIntegerOption(value: string): number {
  if (!/^[0-9]+$/u.test(value)) {
    throw new InvalidArgumentError(`非法整数参数：${value}`);
  }

  return Number.parseInt(value, 10);
}

function normalizeContextItems(
  items: DescribeLogContextResponse["LogContextInfos"]
): Array<Record<string, unknown>> {
  const normalizedItems: Array<Record<string, unknown>> = [];

  for (const item of items ?? []) {
    normalizedItems.push({ ...item });
  }

  return normalizedItems;
}

export async function runContextCommand(
  options: ContextCommandOptions,
  deps: RunContextCommandDependencies
): Promise<CommandSuccessShape<ContextCommandData>> {
  const { request } = resolveContextRequest(options);
  const client = deps.createClient({
    region: options.region
  });
  const response = await client.context(request);

  return {
    ok: true,
    command: "context",
    request,
    data: {
      items: normalizeContextItems(response.LogContextInfos),
      prevOver: response.PrevOver ?? false,
      nextOver: response.NextOver ?? false,
      requestId: response.RequestId ?? null
    }
  };
}

export function registerContextCommand(
  program: Command,
  deps: RunContextCommandDependencies & { writeJson: (value: unknown) => void }
): Command {
  return program
    .command("context <PkgId> <PkgLogId>")
    .description("查询日志上下文")
    .option("--region <region>", "CLS 地域")
    .option("-t, --topic <topic>", "日志主题 ID")
    .option(
      "--btime <btime>",
      "日志基准时间，支持 SearchLog 返回的 Time 毫秒时间戳或已格式化的北京时间字符串"
    )
    .option("--prev-logs <prevLogs>", "返回上文日志数量", parseIntegerOption)
    .option("--next-logs <nextLogs>", "返回下文日志数量", parseIntegerOption)
    .option("--query <query>", "上下文过滤语句")
    .option("--from <from>", "上下文开始时间（毫秒）", parseIntegerOption)
    .option("--to <to>", "上下文结束时间（毫秒）", parseIntegerOption)
    .action(async (pkgId: string, pkgLogId: string, options: ContextCommandOptions) => {
      const result = await runContextCommand(
        {
          ...options,
          pkgId,
          pkgLogId
        },
        deps
      );
      deps.writeJson(result);
    });
}
