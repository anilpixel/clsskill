import type { NormalizedSpan, TraceTreeBuildResult, TraceTreeNode } from "../types.js";

export function buildTraceTree(spans: NormalizedSpan[]): TraceTreeBuildResult {
  const nodes = new Map<string, TraceTreeNode>();
  const roots: TraceTreeNode[] = [];
  const naturalRootSpanIds: string[] = [];
  const orphanSpanIds: string[] = [];
  const missingParentSpanIds = new Set<string>();

  for (const span of spans) {
    nodes.set(span.spanId, {
      span,
      children: []
    });
  }

  for (const span of spans) {
    const currentNode = nodes.get(span.spanId);
    if (!currentNode) {
      continue;
    }

    if (!span.parentSpanId) {
      roots.push(currentNode);
      naturalRootSpanIds.push(span.spanId);
      continue;
    }

    const parentNode = nodes.get(span.parentSpanId);
    if (!parentNode) {
      roots.push(currentNode);
      orphanSpanIds.push(span.spanId);
      missingParentSpanIds.add(span.parentSpanId);
      continue;
    }

    parentNode.children.push(currentNode);
  }

  return {
    tree: roots,
    rootSpanIds: roots.map((node) => node.span.spanId),
    integrity: {
      hasMissingParentLinks: orphanSpanIds.length > 0,
      naturalRootSpanIds,
      orphanSpanIds,
      missingParentSpanIds: [...missingParentSpanIds]
    }
  };
}
