import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { decodeOtelSpanPayload } from "../src/domain/otel-payload.js";

describe("decodeOtelSpanPayload", () => {
  it("解码 base64 + gzip 的 OTel span 载荷", () => {
    const payload = Buffer.from(
      gzipSync(
        JSON.stringify([
          {
            TraceID: "trace-otel",
            SpanID: "span-otel",
            ParentSpanID: "",
            OperationName: "query",
            StartTimeMillis: 1710000000001,
            Duration: 2100,
            Process: {
              ServiceName: "apm-api",
              Tags: []
            },
            Tags: []
          }
        ])
      )
    ).toString("base64");

    expect(decodeOtelSpanPayload(payload)).toEqual([
      {
        TraceID: "trace-otel",
        SpanID: "span-otel",
        ParentSpanID: "",
        OperationName: "query",
        StartTimeMillis: 1710000000001,
        Duration: 2100,
        Process: {
          ServiceName: "apm-api",
          Tags: []
        },
        Tags: []
      }
    ]);
  });
});
