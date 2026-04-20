export interface SpanFilter {
  Key: string;
  Type: string;
  Value: string;
}

export type QuerySource = "apm" | "otel";
export type SortKey = "startTime" | "endTime" | "duration";
export type SortOrder = "asc" | "desc";

export interface BuildSpanFiltersInput {
  traceIds?: string[];
  service?: string;
  spanId?: string;
  operation?: string;
  customFilters?: string[];
}

export interface NormalizedSpan {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  serviceName: string | null;
  operationName: string | null;
  startTimeMs: number | null;
  durationUs: number | null;
  tags: Record<string, string>;
}

export interface TraceTreeNode {
  span: NormalizedSpan;
  children: TraceTreeNode[];
}

export interface TraceIntegrity {
  hasMissingParentLinks: boolean;
  naturalRootSpanIds: string[];
  orphanSpanIds: string[];
  missingParentSpanIds: string[];
}

export interface TraceTreeBuildResult {
  tree: TraceTreeNode[];
  rootSpanIds: string[];
  integrity: TraceIntegrity;
}

export interface TraceResult {
  traceId: string | null;
  spanCount: number;
  rootSpanIds: string[];
  integrity: TraceIntegrity;
  spans: NormalizedSpan[];
  tree: TraceTreeNode[];
}

export interface ResolveTimeRangeInput {
  last?: string;
  start?: string;
  end?: string;
  now?: Date;
}

export interface ResolvedTimeRange {
  startTime: number;
  endTime: number;
}

export interface SearchRequestInput {
  instanceId: string;
  businessName?: string;
  range: ResolvedTimeRange;
  filters?: SpanFilter[];
  limit?: number;
  offset?: number;
  sortKey?: SortKey;
  sortOrder?: SortOrder;
}

export interface SearchRequest {
  InstanceId: string;
  BusinessName?: string;
  StartTime: number;
  EndTime: number;
  Filters?: SpanFilter[];
  Limit?: number;
  Offset?: number;
  OrderBy?: {
    Key: SortKey;
    Value: SortOrder;
  };
}

export interface TencentSpanTag {
  Type?: string;
  Key?: string;
  Value?: string;
}

export interface TencentSpanProcess {
  ServiceName?: string;
  Tags?: TencentSpanTag[];
}

export interface TencentSpan {
  TraceID?: string;
  SpanID?: string;
  ParentSpanID?: string;
  OperationName?: string;
  StartTimeMillis?: number;
  Duration?: number;
  Tags?: TencentSpanTag[];
  Process?: TencentSpanProcess;
}

export interface AppConfig {
  secretId: string;
  secretKey: string;
  region: string;
  instanceId?: string;
  businessName?: string;
}

export interface APMInstanceSummary {
  instanceId: string;
  name: string | null;
  region: string | null;
  status: number | null;
}

export interface CommandErrorShape {
  ok: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export interface CommandSuccessShape<TData> {
  ok: true;
  command: string;
  source: QuerySource;
  request: unknown;
  data: TData;
  requestId?: string;
}
