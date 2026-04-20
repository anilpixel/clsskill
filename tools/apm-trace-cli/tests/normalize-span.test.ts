import { describe, expect, it } from "vitest";
import { normalizeSpan } from "../src/domain/normalize-span.js";

describe("normalizeSpan", () => {
  it("把 SDK span 规范化成稳定结构", () => {
    const span = normalizeSpan({
      TraceID: "trace-1",
      SpanID: "span-1",
      ParentSpanID: "root",
      OperationName: "GET /orders",
      StartTimeMillis: 1710000000000,
      Duration: 3200,
      Process: {
        ServiceName: "gateway",
        Tags: []
      },
      Tags: [
        {
          Type: "string",
          Key: "http.method",
          Value: "GET"
        }
      ]
    });

    expect(span).toEqual({
      traceId: "trace-1",
      spanId: "span-1",
      parentSpanId: "root",
      serviceName: "gateway",
      operationName: "GET /orders",
      startTimeMs: 1710000000000,
      durationUs: 3200,
      tags: {
        "http.method": "GET"
      }
    });
  });
});
