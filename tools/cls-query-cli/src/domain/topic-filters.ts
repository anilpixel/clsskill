export interface TopicsCommandInput {
  region?: string;
  topicName?: string;
  logsetName?: string;
  logsetId?: string;
  limit?: number;
  offset?: number;
}

export interface TopicFilter {
  Key: string;
  Values: string[];
}

export interface DescribeTopicsRequest {
  Filters?: TopicFilter[];
  Offset?: number;
  Limit?: number;
  PreciseSearch?: number;
}

export interface TopicInfo {
  LogsetId?: string;
  TopicId?: string;
  TopicName?: string;
}

export interface DescribeTopicsResponse {
  Topics?: TopicInfo[];
  TotalCount?: number;
  RequestId?: string;
}

function appendFilter(filters: TopicFilter[], key: string, value: string | undefined): void {
  if (!value) {
    return;
  }

  filters.push({
    Key: key,
    Values: [value]
  });
}

export function buildTopicsRequest(input: TopicsCommandInput): DescribeTopicsRequest {
  const request: DescribeTopicsRequest = {};
  const filters: TopicFilter[] = [];

  appendFilter(filters, "topicName", input.topicName);
  appendFilter(filters, "logsetName", input.logsetName);
  appendFilter(filters, "logsetId", input.logsetId);

  if (filters.length > 0) {
    request.Filters = filters;
  }

  if (typeof input.limit === "number") {
    request.Limit = input.limit;
  }

  if (typeof input.offset === "number") {
    request.Offset = input.offset;
  }

  return request;
}
