import { describe, expect, it } from "vitest";
import { buildTraceResult } from "../src/domain/trace-result.js";
import type { NormalizedSpan } from "../src/types.js";

describe("buildTraceResult", () => {
  it("生成稳定的 trace 输出结构", () => {
    const spans: NormalizedSpan[] = [
      {
        traceId: "trace-1",
        spanId: "root",
        parentSpanId: null,
        serviceName: "gateway",
        operationName: "GET /orders",
        startTimeMs: 1000,
        durationUs: 5000,
        tags: {}
      },
      {
        traceId: "trace-1",
        spanId: "child",
        parentSpanId: "root",
        serviceName: "order",
        operationName: "CreateOrder",
        startTimeMs: 1100,
        durationUs: 2000,
        tags: {}
      }
    ];

    expect(buildTraceResult(spans)).toEqual({
      traceId: "trace-1",
      spanCount: 2,
      rootSpanIds: ["root"],
      integrity: {
        hasMissingParentLinks: false,
        naturalRootSpanIds: ["root"],
        orphanSpanIds: [],
        missingParentSpanIds: []
      },
      spans,
      tree: [
        {
          span: spans[0],
          children: [
            {
              span: spans[1],
              children: []
            }
          ]
        }
      ]
    });
  });

  it("标记因为缺失父节点而提升为 root 的孤儿 span", () => {
    const spans: NormalizedSpan[] = [
      {
        traceId: "trace-2",
        spanId: "orphan",
        parentSpanId: "missing-parent",
        serviceName: "worker",
        operationName: "Task",
        startTimeMs: 2000,
        durationUs: 3000,
        tags: {}
      }
    ];

    expect(buildTraceResult(spans)).toEqual({
      traceId: "trace-2",
      spanCount: 1,
      rootSpanIds: ["orphan"],
      integrity: {
        hasMissingParentLinks: true,
        naturalRootSpanIds: [],
        orphanSpanIds: ["orphan"],
        missingParentSpanIds: ["missing-parent"]
      },
      spans,
      tree: [
        {
          span: spans[0],
          children: []
        }
      ]
    });
  });
});
