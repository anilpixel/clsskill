import type { BuildSpanFiltersInput, SpanFilter } from "../types.js";

function parseCustomFilter(input: string): SpanFilter {
  const parts = input.split(":");
  if (parts.length < 3) {
    throw new Error(`非法过滤器格式：${input}`);
  }

  const [key, type, ...rest] = parts;
  const value = rest.join(":");

  if (!key || !type || !value) {
    throw new Error(`非法过滤器格式：${input}`);
  }

  return {
    Key: key,
    Type: type,
    Value: value
  };
}

export function buildSpanFilters(input: BuildSpanFiltersInput): SpanFilter[] {
  const filters: SpanFilter[] = [];

  if (input.traceIds && input.traceIds.length > 0) {
    filters.push({
      Key: "traceID",
      Type: "in",
      Value: input.traceIds.join(",")
    });
  }

  if (input.service) {
    filters.push({
      Key: "service.name",
      Type: "=",
      Value: input.service
    });
  }

  if (input.spanId) {
    filters.push({
      Key: "spanID",
      Type: "=",
      Value: input.spanId
    });
  }

  if (input.operation) {
    filters.push({
      Key: "operationName",
      Type: "=",
      Value: input.operation
    });
  }

  for (const customFilter of input.customFilters ?? []) {
    filters.push(parseCustomFilter(customFilter));
  }

  return filters;
}
