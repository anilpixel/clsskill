import { buildTraceTree } from "./trace-tree.js";
import type { NormalizedSpan, TraceResult } from "../types.js";

export function buildTraceResult(spans: NormalizedSpan[]): TraceResult {
  const treeResult = buildTraceTree(spans);
  return {
    traceId: spans[0]?.traceId ?? null,
    spanCount: spans.length,
    rootSpanIds: treeResult.rootSpanIds,
    integrity: treeResult.integrity,
    spans,
    tree: treeResult.tree
  };
}
