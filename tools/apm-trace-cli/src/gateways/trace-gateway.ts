import { decodeOtelSpanPayload } from "../domain/otel-payload.js";
import { normalizeSpan } from "../domain/normalize-span.js";
import { normalizeSdkError } from "../sdk-client.js";
import type { SearchResult } from "../apm-client.js";
import type { QuerySource, SearchRequest, TencentSpan } from "../types.js";
import type { SdkClientLike } from "../sdk-client.js";

function normalizeSpans(spans: TencentSpan[]) {
  return spans
    .map((span) => normalizeSpan(span))
    .filter((span) => span.traceId !== "" && span.spanId !== "");
}

export interface TraceGateway {
  search(source: QuerySource, request: SearchRequest): Promise<SearchResult>;
  raw(source: QuerySource, request: SearchRequest): Promise<unknown>;
}

export function createTraceGateway(client: Pick<SdkClientLike, "DescribeGeneralSpanList" | "DescribeGeneralOTSpanList">): TraceGateway {
  return {
    async search(source, request) {
      try {
        if (source === "otel") {
          const response = await client.DescribeGeneralOTSpanList(request);
          const decoded = decodeOtelSpanPayload(response.Spans ?? "");
          return {
            request,
            totalCount: response.TotalCount ?? decoded.length,
            spans: normalizeSpans(decoded),
            requestId: response.RequestId
          };
        }

        const response = await client.DescribeGeneralSpanList(request);
        return {
          request,
          totalCount: response.TotalCount ?? response.Spans?.length ?? 0,
          spans: normalizeSpans(response.Spans ?? []),
          requestId: response.RequestId
        };
      } catch (error) {
        normalizeSdkError(error);
      }
    },

    async raw(source, request) {
      try {
        if (source === "otel") {
          return client.DescribeGeneralOTSpanList(request);
        }
        return client.DescribeGeneralSpanList(request);
      } catch (error) {
        normalizeSdkError(error);
      }
    }
  };
}
