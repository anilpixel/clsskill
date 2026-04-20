import { describe, expect, it } from "vitest";
import { CliError } from "../src/config.js";
import { resolveTimeRange } from "../src/domain/time-range.js";

describe("resolveTimeRange", () => {
  it.each([
    ["15m", new Date("1970-01-01T00:30:00.000Z"), { startTime: 900, endTime: 1800 }],
    ["2h", new Date("1970-01-01T02:00:00.000Z"), { startTime: 0, endTime: 7200 }],
    ["1d", new Date("1970-01-02T00:00:00.000Z"), { startTime: 0, endTime: 86400 }]
  ])("支持 --last %s", (last, now, expected) => {
    expect(resolveTimeRange({ last, now })).toEqual(expected);
  });

  it("支持 from/to 毫秒时间戳并转换为秒级范围", () => {
    expect(
      resolveTimeRange({
        from: 1_700_000_000_123,
        to: 1_700_000_123_999
      })
    ).toEqual({
      startTime: 1_700_000_000,
      endTime: 1_700_000_123
    });
  });

  it("last 模式下会校验 now 是否为有效日期", () => {
    let caught: unknown;

    try {
      resolveTimeRange({
        last: "15m",
        now: new Date("invalid")
      });
    } catch (error: unknown) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(CliError);
    expect(caught).toMatchObject({
      code: "TIME_RANGE_INVALID",
      message: "now 必须是有效日期"
    });
  });

  it("缺少时间范围时抛出结构化错误", () => {
    let caught: unknown;

    try {
      resolveTimeRange({});
    } catch (error: unknown) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(CliError);
    expect(caught).toMatchObject({
      code: "TIME_RANGE_MISSING",
      message: "必须传入 --last 或 from/to"
    });
  });
});
