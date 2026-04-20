import { InvalidArgumentError, type Command } from "commander";
import type { ClsClient } from "../cls-client.js";
import type { CommandSuccessShape } from "../types.js";
import {
  buildTopicsRequest,
  type TopicInfo,
  type TopicsCommandInput
} from "../domain/topic-filters.js";

export interface RunTopicsCommandDependencies {
  createClient: (config?: { region?: string }) => ClsClient;
}

export type TopicsCommandOptions = TopicsCommandInput;

export interface TopicsCommandData {
  totalCount: number;
  items: TopicInfo[];
}

function parseIntegerOption(value: string): number {
  if (!/^[0-9]+$/u.test(value)) {
    throw new InvalidArgumentError(`非法整数参数：${value}`);
  }

  return Number.parseInt(value, 10);
}

export async function runTopicsCommand(
  options: TopicsCommandOptions,
  deps: RunTopicsCommandDependencies
): Promise<CommandSuccessShape<TopicsCommandData>> {
  const client = deps.createClient({
    region: options.region
  });
  const request = buildTopicsRequest(options);
  const response = await client.topics(request);
  const data: TopicsCommandData = {
    totalCount: response.TotalCount ?? 0,
    items: response.Topics ?? []
  };

  return {
    ok: true,
    command: "topics",
    request,
    data
  };
}

export function registerTopicsCommand(
  program: Command,
  deps: RunTopicsCommandDependencies & { writeJson: (value: unknown) => void }
): Command {
  return program
    .command("topics")
    .description("列出日志主题")
    .option("--region <region>", "CLS 地域")
    .option("--topic-name <topicName>", "按主题名称过滤")
    .option("--logset-name <logsetName>", "按日志集名称过滤")
    .option("--logset-id <logsetId>", "按日志集 ID 过滤")
    .option("--limit <limit>", "每页返回数量", parseIntegerOption)
    .option("--offset <offset>", "查询偏移量", parseIntegerOption)
    .action(async (options: TopicsCommandOptions) => {
      const result = await runTopicsCommand(options, deps);
      deps.writeJson(result);
    });
}
