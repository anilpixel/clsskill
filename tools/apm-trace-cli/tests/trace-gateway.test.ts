import { describe, expect, it } from "vitest";
import { createTraceGateway } from "../src/gateways/trace-gateway.js";
import type { SearchRequest } from "../src/types.js";

describe("trace gateway", () => {
  it("规范化普通 APM span 查询结果", async () => {
    const gateway = createTraceGateway({
      async DescribeGeneralSpanList(_request: SearchRequest) {
        return {
          TotalCount: 1,
          RequestId: "req-apm",
          Spans: [
            {
              TraceID: "trace-1",
              SpanID: "span-1",
              OperationName: "GET /health",
              StartTimeMillis: 1710000000000,
              Duration: 1200,
              Process: {
                ServiceName: "gateway",
                Tags: []
              },
              Tags: []
            }
          ]
        };
      },
      async DescribeGeneralOTSpanList() {
        throw new Error("不该调用");
      }
    });

    const result = await gateway.search("apm", {
      InstanceId: "apm-1",
      StartTime: 1710000000,
      EndTime: 1710000600
    });

    expect(result).toEqual({
      request: {
        InstanceId: "apm-1",
        StartTime: 1710000000,
        EndTime: 1710000600
      },
      totalCount: 1,
      requestId: "req-apm",
      spans: [
        {
          traceId: "trace-1",
          spanId: "span-1",
          parentSpanId: null,
          serviceName: "gateway",
          operationName: "GET /health",
          startTimeMs: 1710000000000,
          durationUs: 1200,
          tags: {}
        }
      ]
    });
  });
});
