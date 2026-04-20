import { describe, expect, it } from "vitest";
import { resolveTimeRange } from "../src/domain/time-range.js";

describe("resolveTimeRange", () => {
  it("支持最近时间窗口", () => {
    const range = resolveTimeRange({
      last: "15m",
      now: new Date("2026-04-17T08:30:00.000Z")
    });

    expect(range).toEqual({
      startTime: 1776413700,
      endTime: 1776414600
    });
  });
});
