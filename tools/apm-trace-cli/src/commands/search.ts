import { buildSpanFilters } from "../domain/filters.js";
import { resolveInstanceSelection } from "../domain/instance-resolution.js";
import { buildSearchRequest } from "../domain/search-request.js";
import { resolveTimeRange } from "../domain/time-range.js";
import type { APMClient } from "../apm-client.js";
import type { CommandSuccessShape, NormalizedSpan, QuerySource, SortKey, SortOrder } from "../types.js";

export interface SearchCommandOptions {
  source: QuerySource;
  instanceId?: string;
  businessName?: string;
  traceId?: string;
  service?: string;
  spanId?: string;
  operation?: string;
  filter?: string[];
  last?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
  sortKey?: SortKey;
  sortOrder?: SortOrder;
}

export async function runSearchCommand(
  client: APMClient,
  options: SearchCommandOptions
): Promise<CommandSuccessShape<{ totalCount: number; items: NormalizedSpan[] }>> {
  const config = client.getConfig();
  const selected = await resolveInstanceSelection({
    config,
    instanceId: options.instanceId,
    businessName: options.businessName,
    listInstances: async () => (await client.listInstances()).items
  });
  const request = buildSearchRequest({
    instanceId: selected.instanceId,
    businessName: selected.businessName,
    range: resolveTimeRange({
      last: options.last,
      start: options.start,
      end: options.end
    }),
    filters: buildSpanFilters({
      traceIds: options.traceId ? [options.traceId] : undefined,
      service: options.service,
      spanId: options.spanId,
      operation: options.operation,
      customFilters: options.filter
    }),
    limit: options.limit,
    offset: options.offset,
    sortKey: options.sortKey,
    sortOrder: options.sortOrder
  });

  const result = await client.search(options.source, request);
  return {
    ok: true,
    command: "search",
    source: options.source,
    request,
    data: {
      totalCount: result.totalCount,
      items: result.spans
    },
    requestId: result.requestId
  };
}
