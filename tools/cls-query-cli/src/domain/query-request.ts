import { CliError } from "../config.js";
import { resolveTimeRange } from "./time-range.js";
import type {
  MultiTopicSearchInformation,
  SearchLogRequest
} from "tencentcloud-sdk-nodejs-cls/tencentcloud/services/cls/v20201016/cls_models.js";

export interface QueryRequestInput {
  query?: string;
  topic?: string;
  topics?: string[];
  last?: string;
  from?: number;
  to?: number;
  limit?: number;
  max?: number;
  sort?: string;
}

export interface ResolvedQueryRequest {
  request: SearchLogRequest;
  max: number;
}

function normalizeTopics(topics: string[] | undefined): string[] {
  if (topics === undefined) {
    return [];
  }

  return topics.map((topic) => topic.trim()).filter((topic) => topic.length > 0);
}

function normalizeTopic(topic: string | undefined): string | undefined {
  if (topic === undefined) {
    return undefined;
  }

  const trimmed = topic.trim();
  if (trimmed.length === 0) {
    throw new CliError("QUERY_TOPIC_INVALID", "--topic 不能为空白");
  }

  return trimmed;
}

function normalizeQueryString(query: string | undefined): string {
  const trimmed = query?.trim();
  if (!trimmed) {
    return "*";
  }

  return trimmed;
}

function buildTopicItems(topics: string[]): MultiTopicSearchInformation[] {
  return topics.map((TopicId) => ({
    TopicId
  }));
}

function requirePositiveInteger(
  value: number | undefined,
  code: string,
  message: string
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new CliError(code, message);
  }

  return value;
}

export function resolveQueryRequest(
  input: QueryRequestInput,
  now: Date = new Date()
): ResolvedQueryRequest {
  const topicId = normalizeTopic(input.topic);
  const topics = normalizeTopics(input.topics);

  if (topicId && topics.length > 0) {
    throw new CliError("QUERY_TOPIC_CONFLICT", "不能同时传入 --topic 与 --topics");
  }

  const timeRange = resolveTimeRange({
    last: input.last,
    from: input.from,
    to: input.to,
    now
  });

  const limit = requirePositiveInteger(
    input.limit,
    "QUERY_LIMIT_INVALID",
    "--limit 必须是正整数"
  ) ?? 100;
  const max = requirePositiveInteger(
    input.max,
    "QUERY_MAX_INVALID",
    "--max 必须是正整数"
  ) ?? 0;

  if (topics.length > 0 && max > 0) {
    throw new CliError(
      "QUERY_TOPICS_PAGINATION_UNSUPPORTED",
      "多主题查询暂不支持自动翻页，请不要同时传入 --topics 和 --max"
    );
  }

  const request: SearchLogRequest = {
    From: timeRange.startTime * 1000,
    To: timeRange.endTime * 1000,
    QueryString: normalizeQueryString(input.query),
    Limit: limit
  };

  if (topicId) {
    request.TopicId = topicId;
  }

  if (topics.length > 0) {
    request.Topics = buildTopicItems(topics);
  }

  if (input.sort !== undefined) {
    request.Sort = input.sort;
  }

  if (max > 0 && request.Limit !== undefined && request.Limit > max) {
    request.Limit = max;
  }

  return {
    request,
    max
  };
}
