import type { ResolvedTimeRange, ResolveTimeRangeInput } from "../types.js";

function parseDurationSeconds(input: string): number {
  const matched = input.match(/^(\d+)([smhd])$/);
  if (!matched) {
    throw new Error(`非法时间窗口：${input}`);
  }

  const value = Number.parseInt(matched[1], 10);
  const unit = matched[2];

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 60 * 60 * 24;
    default:
      throw new Error(`不支持的时间单位：${unit}`);
  }
}

function parseAbsoluteTime(input: string): number {
  if (/^\d+$/.test(input)) {
    return Number.parseInt(input, 10);
  }

  const milliseconds = Date.parse(input);
  if (Number.isNaN(milliseconds)) {
    throw new Error(`非法时间格式：${input}`);
  }
  return Math.floor(milliseconds / 1000);
}

export function resolveTimeRange(input: ResolveTimeRangeInput): ResolvedTimeRange {
  const hasLast = typeof input.last === "string" && input.last.length > 0;
  const hasAbsolute = Boolean(input.start && input.end);

  if (hasLast && hasAbsolute) {
    throw new Error('不能同时传入 "last" 与 "start/end"');
  }

  if (!hasLast && !hasAbsolute) {
    throw new Error('必须传入 "last" 或 "start/end"');
  }

  if (hasLast) {
    const now = input.now ?? new Date();
    const endTime = Math.floor(now.getTime() / 1000);
    const durationSeconds = parseDurationSeconds(input.last!);
    return {
      startTime: endTime - durationSeconds,
      endTime
    };
  }

  return {
    startTime: parseAbsoluteTime(input.start!),
    endTime: parseAbsoluteTime(input.end!)
  };
}
