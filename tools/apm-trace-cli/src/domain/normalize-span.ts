import type { NormalizedSpan, TencentSpan } from "../types.js";

function normalizeTags(span: TencentSpan): Record<string, string> {
  const tags: Record<string, string> = {};

  for (const tag of span.Tags ?? []) {
    if (tag.Key) {
      tags[tag.Key] = tag.Value ?? "";
    }
  }

  return tags;
}

export function normalizeSpan(span: TencentSpan): NormalizedSpan {
  return {
    traceId: span.TraceID ?? "",
    spanId: span.SpanID ?? "",
    parentSpanId: span.ParentSpanID || null,
    serviceName: span.Process?.ServiceName ?? null,
    operationName: span.OperationName ?? null,
    startTimeMs: span.StartTimeMillis ?? null,
    durationUs: span.Duration ?? null,
    tags: normalizeTags(span)
  };
}
