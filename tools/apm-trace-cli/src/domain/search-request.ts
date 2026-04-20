import type { SearchRequest, SearchRequestInput } from "../types.js";

export function buildSearchRequest(input: SearchRequestInput): SearchRequest {
  const request: SearchRequest = {
    InstanceId: input.instanceId,
    StartTime: input.range.startTime,
    EndTime: input.range.endTime
  };

  if (input.businessName) {
    request.BusinessName = input.businessName;
  }

  if (input.filters && input.filters.length > 0) {
    request.Filters = input.filters;
  }

  if (typeof input.limit === "number") {
    request.Limit = input.limit;
  }

  if (typeof input.offset === "number") {
    request.Offset = input.offset;
  }

  if (input.sortKey && input.sortOrder) {
    request.OrderBy = {
      Key: input.sortKey,
      Value: input.sortOrder
    };
  }

  return request;
}
