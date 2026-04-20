import { CliError } from "../config.js";
import type { DescribeLogContextRequest } from "tencentcloud-sdk-nodejs-cls/tencentcloud/services/cls/v20201016/cls_models.js";

export interface ContextRequestInput {
  topic?: string;
  btime?: string;
  pkgId?: string;
  pkgLogId?: string | number;
  prevLogs?: number;
  nextLogs?: number;
  query?: string;
  from?: number;
  to?: number;
}

export interface ResolvedContextRequest {
  request: DescribeLogContextRequest;
}

function formatClsBTimeFromTimestamp(timestampMs: number): string {
  const utcPlus8Date = new Date(timestampMs + 8 * 60 * 60 * 1000);
  const year = utcPlus8Date.getUTCFullYear();
  const month = String(utcPlus8Date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utcPlus8Date.getUTCDate()).padStart(2, "0");
  const hours = String(utcPlus8Date.getUTCHours()).padStart(2, "0");
  const minutes = String(utcPlus8Date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(utcPlus8Date.getUTCSeconds()).padStart(2, "0");
  const milliseconds = String(utcPlus8Date.getUTCMilliseconds()).padStart(3, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function normalizeRequiredText(value: string | undefined, code: string, message: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new CliError(code, message);
  }

  return trimmed;
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

function normalizePkgLogId(value: string | number | undefined): number {
  if (value === undefined) {
    throw new CliError("CONTEXT_PKG_LOG_ID_REQUIRED", "PkgLogId 不能为空");
  }

  const text = typeof value === "number" ? String(value) : value.trim();
  if (!/^[0-9]+$/u.test(text)) {
    throw new CliError("CONTEXT_PKG_LOG_ID_INVALID", "PkgLogId 必须是正整数");
  }

  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new CliError("CONTEXT_PKG_LOG_ID_INVALID", "PkgLogId 必须是正整数");
  }

  return parsed;
}

function normalizeBTime(value: string | undefined): string {
  const text = normalizeRequiredText(value, "CONTEXT_BTIME_REQUIRED", "--btime 不能为空");
  if (!/^[0-9]+$/u.test(text)) {
    return text;
  }

  const rawTimestamp = Number(text);
  if (!Number.isSafeInteger(rawTimestamp) || rawTimestamp <= 0) {
    throw new CliError("CONTEXT_BTIME_INVALID", "--btime 必须是有效时间");
  }

  const timestampMs = text.length <= 10 ? rawTimestamp * 1000 : rawTimestamp;
  return formatClsBTimeFromTimestamp(timestampMs);
}

export function resolveContextRequest(input: ContextRequestInput): ResolvedContextRequest {
  const topicId = normalizeRequiredText(input.topic, "CONTEXT_TOPIC_REQUIRED", "--topic 不能为空");
  const btime = normalizeBTime(input.btime);
  const pkgId = normalizeRequiredText(input.pkgId, "CONTEXT_PKG_ID_REQUIRED", "PkgId 不能为空");
  const pkgLogId = normalizePkgLogId(input.pkgLogId);

  const request: DescribeLogContextRequest = {
    TopicId: topicId,
    BTime: btime,
    PkgId: pkgId,
    PkgLogId: pkgLogId
  };

  const prevLogs = requirePositiveInteger(
    input.prevLogs,
    "CONTEXT_PREV_LOGS_INVALID",
    "--prev-logs 必须是正整数"
  );
  if (prevLogs !== undefined) {
    request.PrevLogs = prevLogs;
  }

  const nextLogs = requirePositiveInteger(
    input.nextLogs,
    "CONTEXT_NEXT_LOGS_INVALID",
    "--next-logs 必须是正整数"
  );
  if (nextLogs !== undefined) {
    request.NextLogs = nextLogs;
  }

  const query = input.query?.trim();
  if (query) {
    request.Query = query;
  }

  if (input.from !== undefined) {
    request.From = input.from;
  }

  if (input.to !== undefined) {
    request.To = input.to;
  }

  return {
    request
  };
}
