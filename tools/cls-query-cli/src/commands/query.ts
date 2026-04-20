import { InvalidArgumentError, type Command } from "commander";
import type { ClsClient } from "../cls-client.js";
import { renderOutput } from "../domain/output.js";
import { resolveQueryRequest, type QueryRequestInput } from "../domain/query-request.js";
import type { CommandSuccessShape, RenderOutputResult } from "../types.js";
import type {
  SearchLogRequest,
  SearchLogResponse
} from "tencentcloud-sdk-nodejs-cls/tencentcloud/services/cls/v20201016/cls_models.js";

export interface QueryCommandOptions extends QueryRequestInput {
  region?: string;
  output?: string;
}

export interface QueryCommandData {
  items: Array<Record<string, unknown>>;
  listOver: boolean;
  context: string | null;
  analysis: boolean;
  requestId: string | null;
}

export interface RunQueryCommandDependencies {
  createClient: (config?: { region?: string }) => ClsClient;
  now?: Date;
  writeOutput: (value: RenderOutputResult) => void | Promise<void>;
}

function parseIntegerOption(value: string): number {
  if (!/^[0-9]+$/u.test(value)) {
    throw new InvalidArgumentError(`非法整数参数：${value}`);
  }

  return Number.parseInt(value, 10);
}

function parseTopicsOption(value: string): string[] {
  const topics = value
    .split(",")
    .map((topic) => topic.trim())
    .filter((topic) => topic.length > 0);

  if (topics.length === 0) {
    throw new InvalidArgumentError(`非法 topics 参数：${value}`);
  }

  return topics;
}

function normalizeResults(results: SearchLogResponse["Results"]): Array<Record<string, unknown>> {
  const items: Array<Record<string, unknown>> = [];

  for (const result of results ?? []) {
    items.push({ ...result });
  }

  return items;
}

function buildNextRequest(request: SearchLogRequest, context: string | null, limit: number): SearchLogRequest {
  const nextRequest: SearchLogRequest = {
    ...request
  };

  if (context !== null) {
    nextRequest.Context = context;
  }

  nextRequest.Limit = limit;

  return nextRequest;
}

export async function runQueryCommand(
  options: QueryCommandOptions,
  deps: RunQueryCommandDependencies
): Promise<CommandSuccessShape<QueryCommandData>> {
  const { request, max } = resolveQueryRequest(options, deps.now);
  const client = deps.createClient({
    region: options.region
  });
  const aggregatedItems: Array<Record<string, unknown>> = [];
  let listOver = false;
  let context: string | null = null;
  let analysis = false;
  let requestId: string | null = null;
  let currentRequest = buildNextRequest(request, null, request.Limit ?? 100);
  const allowPagination =
    max > 0 && request.TopicId !== undefined && request.Topics === undefined;

  for (;;) {
    const response = await client.query(currentRequest);
    const pageItems = normalizeResults(response.Results);
    const remaining = max > 0 ? max - aggregatedItems.length : pageItems.length;
    const visibleItems = max > 0 ? pageItems.slice(0, Math.max(remaining, 0)) : pageItems;

    aggregatedItems.push(...visibleItems);
    listOver = response.ListOver ?? false;
    analysis = response.Analysis ?? false;
    context = response.Context ?? null;
    requestId = response.RequestId ?? null;

    if (max > 0 && aggregatedItems.length >= max) {
      break;
    }

    if (!allowPagination || analysis || listOver || context === null) {
      break;
    }

    const nextLimit = max > 0
      ? Math.min(request.Limit ?? 100, max - aggregatedItems.length)
      : request.Limit ?? 100;

    currentRequest = buildNextRequest(request, context, nextLimit);
  }

  return {
    ok: true,
    command: "query",
    request,
    data: {
      items: aggregatedItems,
      listOver,
      context,
      analysis,
      requestId
    }
  };
}

export function registerQueryCommand(
  program: Command,
  deps: RunQueryCommandDependencies
): Command {
  return program
    .command("query")
    .description("查询日志")
    .option("--region <region>", "CLS 地域")
    .option("-q, --query <query>", "检索语句")
    .option("-t, --topic <topic>", "单个日志主题 ID")
    .option("--topics <topics>", "多个日志主题 ID，逗号分隔", parseTopicsOption)
    .option("--last <last>", "相对时间窗口，例如 15m")
      .option("--from <from>", "起始时间戳（毫秒）", parseIntegerOption)
      .option("--to <to>", "结束时间戳（毫秒）", parseIntegerOption)
    .option("--limit <limit>", "单次返回条数", parseIntegerOption)
    .option("--max <max>", "最多聚合条数", parseIntegerOption)
    .option("--sort <sort>", "原始日志排序顺序")
    .option("--output <output>", "输出目标：json、csv 或文件路径")
    .action(async (options: QueryCommandOptions) => {
      const result = await runQueryCommand(options, deps);
      await deps.writeOutput(renderOutput(result, options.output));
    });
}
