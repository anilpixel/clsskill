import { CliError } from "../config.js";
import type { ResolveTimeRangeInput, ResolvedTimeRange } from "../types.js";

function parseDurationSeconds(input: string): number {
  const matched = input.match(/^(\d+)([smhd])$/u);
  if (!matched) {
    throw new CliError("TIME_RANGE_INVALID", `非法时间窗口：${input}`);
  }

  const amount = Number.parseInt(matched[1], 10);
  const unit = matched[2];

  switch (unit) {
    case "s":
      return amount;
    case "m":
      return amount * 60;
    case "h":
      return amount * 60 * 60;
    case "d":
      return amount * 60 * 60 * 24;
    default:
      throw new CliError("TIME_RANGE_INVALID", `不支持的时间单位：${unit}`);
  }
}

function hasFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidDate(value: Date | undefined): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

export function resolveTimeRange(input: ResolveTimeRangeInput): ResolvedTimeRange {
  const last = input.last;
  const from = input.from;
  const to = input.to;
  const hasLast = typeof last === "string" && last.length > 0;
  const hasFrom = hasFiniteNumber(from);
  const hasTo = hasFiniteNumber(to);
  const hasAbsoluteRange = hasFrom && hasTo;
  const now = input.now ?? new Date();

  if (hasLast && hasAbsoluteRange) {
    throw new CliError("TIME_RANGE_CONFLICT", "不能同时传入 --last 与 from/to");
  }

  if (!hasLast && !hasAbsoluteRange) {
    throw new CliError("TIME_RANGE_MISSING", "必须传入 --last 或 from/to");
  }

  if (hasLast) {
    if (!isValidDate(now)) {
      throw new CliError("TIME_RANGE_INVALID", "now 必须是有效日期");
    }

    const endTime = Math.floor(now.getTime() / 1000);
    const startTime = endTime - parseDurationSeconds(last);
    return {
      startTime,
      endTime
    };
  }

  if (!hasFrom || !hasTo) {
    throw new CliError("TIME_RANGE_INVALID", "from/to 必须同时提供");
  }

  if (from > to) {
    throw new CliError("TIME_RANGE_INVALID", "from 不能大于 to");
  }

  return {
    startTime: Math.floor(from / 1000),
    endTime: Math.floor(to / 1000)
  };
}
