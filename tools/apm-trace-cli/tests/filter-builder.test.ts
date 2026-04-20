import { describe, expect, it } from "vitest";
import { buildSpanFilters } from "../src/domain/filters.js";

describe("buildSpanFilters", () => {
  it("把高层查询参数映射成 APM 过滤器", () => {
    const filters = buildSpanFilters({
      traceIds: ["trace-a", "trace-b"],
      service: "order-service",
      spanId: "span-root",
      operation: "/orders/create",
      customFilters: ["http.status_code:=:500"]
    });

    expect(filters).toEqual([
      { Key: "traceID", Type: "in", Value: "trace-a,trace-b" },
      { Key: "service.name", Type: "=", Value: "order-service" },
      { Key: "spanID", Type: "=", Value: "span-root" },
      { Key: "operationName", Type: "=", Value: "/orders/create" },
      { Key: "http.status_code", Type: "=", Value: "500" }
    ]);
  });
});
