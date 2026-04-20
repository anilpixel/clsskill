import { describe, expect, it } from "vitest";
import { buildTraceTree } from "../src/domain/trace-tree.js";
import type { NormalizedSpan } from "../src/types.js";

describe("buildTraceTree", () => {
  it("根据父子关系构建 trace 树", () => {
    const spans: NormalizedSpan[] = [
      {
        traceId: "trace-1",
        spanId: "root",
        parentSpanId: null,
        serviceName: "gateway",
        operationName: "GET /orders",
        startTimeMs: 1000,
        durationUs: 4000,
        tags: {}
      },
      {
        traceId: "trace-1",
        spanId: "child-1",
        parentSpanId: "root",
        serviceName: "order",
        operationName: "CreateOrder",
        startTimeMs: 1100,
        durationUs: 2000,
        tags: {}
      }
    ];

    expect(buildTraceTree(spans)).toEqual({
      rootSpanIds: ["root"],
      integrity: {
        hasMissingParentLinks: false,
        naturalRootSpanIds: ["root"],
        orphanSpanIds: [],
        missingParentSpanIds: []
      },
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
});
