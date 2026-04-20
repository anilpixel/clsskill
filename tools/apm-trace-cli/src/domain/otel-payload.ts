import { gunzipSync } from "node:zlib";
import type { TencentSpan, TencentSpanProcess, TencentSpanTag } from "../types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeTag(value: unknown): TencentSpanTag | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    Type: typeof value.Type === "string" ? value.Type : undefined,
    Key: typeof value.Key === "string" ? value.Key : undefined,
    Value: typeof value.Value === "string" ? value.Value : undefined
  };
}

function normalizeProcess(value: unknown): TencentSpanProcess | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const tags = Array.isArray(value.Tags)
    ? value.Tags
        .map((tag) => normalizeTag(tag))
        .filter((tag): tag is TencentSpanTag => tag !== null)
    : [];

  return {
    ServiceName: typeof value.ServiceName === "string" ? value.ServiceName : undefined,
    Tags: tags
  };
}

function normalizeSpan(value: unknown): TencentSpan | null {
  if (!isRecord(value)) {
    return null;
  }

  const tags = Array.isArray(value.Tags)
    ? value.Tags
        .map((tag) => normalizeTag(tag))
        .filter((tag): tag is TencentSpanTag => tag !== null)
    : [];

  return {
    TraceID: typeof value.TraceID === "string" ? value.TraceID : undefined,
    SpanID: typeof value.SpanID === "string" ? value.SpanID : undefined,
    ParentSpanID: typeof value.ParentSpanID === "string" ? value.ParentSpanID : undefined,
    OperationName: typeof value.OperationName === "string" ? value.OperationName : undefined,
    StartTimeMillis: typeof value.StartTimeMillis === "number" ? value.StartTimeMillis : undefined,
    Duration: typeof value.Duration === "number" ? value.Duration : undefined,
    Process: normalizeProcess(value.Process),
    Tags: tags
  };
}

export function decodeOtelSpanPayload(payload: string): TencentSpan[] {
  if (!payload) {
    return [];
  }

  const compressed = Buffer.from(payload, "base64");
  const json = gunzipSync(compressed).toString("utf8");
  const parsed: unknown = JSON.parse(json);

  if (!Array.isArray(parsed)) {
    throw new Error("OTel span 载荷不是数组");
  }

  return parsed
    .map((item) => normalizeSpan(item))
    .filter((item): item is TencentSpan => item !== null);
}
