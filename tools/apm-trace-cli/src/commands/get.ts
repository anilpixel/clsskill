import { buildSpanFilters } from "../domain/filters.js";
import { resolveInstanceSelection } from "../domain/instance-resolution.js";
import { buildSearchRequest } from "../domain/search-request.js";
import { buildTraceResult } from "../domain/trace-result.js";
import { resolveTimeRange } from "../domain/time-range.js";
import type { APMClient } from "../apm-client.js";
import type { CommandSuccessShape, QuerySource } from "../types.js";

export interface GetCommandOptions {
  source: QuerySource;
  traceId: string;
  instanceId?: string;
  businessName?: string;
  last?: string;
  start?: string;
  end?: string;
  limit?: number;
}

export async function runGetCommand(
  client: APMClient,
  options: GetCommandOptions
): Promise<CommandSuccessShape<ReturnType<typeof buildTraceResult>>> {
  const config = client.getConfig();
  const selected = await resolveInstanceSelection({
    config,
    instanceId: options.instanceId,
    businessName: options.businessName,
    listInstances: async () => (await client.listInstances()).items
  });
  const pageLimit = options.limit ?? (options.source === "otel" ? 10000 : 1000);
  let offset = 0;
  let totalCount = 0;
  const spans = [];
  const range = resolveTimeRange({
    last: options.last,
    start: options.start,
      end: options.end
  });
  const baseRequest = buildSearchRequest({
    instanceId: selected.instanceId,
    businessName: selected.businessName,
    range,
    filters: buildSpanFilters({
      traceIds: [options.traceId]
    }),
    limit: pageLimit
  });

  while (true) {
    const request = {
      ...baseRequest,
      Offset: offset
    };
    const page = await client.search(options.source, request);
    totalCount = page.totalCount;
    spans.push(...page.spans);

    offset += pageLimit;
    if (page.spans.length === 0 || offset >= totalCount) {
      return {
        ok: true,
        command: "get",
        source: options.source,
        request: baseRequest,
        data: buildTraceResult(spans),
        requestId: page.requestId
      };
    }
  }
}
