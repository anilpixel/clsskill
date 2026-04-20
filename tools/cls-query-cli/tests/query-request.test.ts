import { describe, expect, it } from "vitest";
import { CliError } from "../src/config.js";
import { resolveQueryRequest } from "../src/domain/query-request.js";

describe("resolveQueryRequest", () => {
  it("会把查询条件映射为 SearchLogRequest，并将时间范围转换为毫秒", () => {
    const result = resolveQueryRequest(
      {
        query: "level:ERROR",
        topic: "topic-1",
        last: "15m",
        limit: 200,
        max: 3,
        sort: "desc"
      },
      new Date("1970-01-01T00:30:00.000Z")
    );

    expect(result).toEqual({
      max: 3,
      request: {
        From: 900_000,
        To: 1_800_000,
        QueryString: "level:ERROR",
        TopicId: "topic-1",
        Sort: "desc",
        Limit: 3
      }
    });
  });

  it("会把多个 topic 映射为 Topics，并在缺少 query 时默认查询全部日志", () => {
    const result = resolveQueryRequest(
      {
        topics: ["topic-a", "topic-b"],
        from: 1_700_000_000_123,
        to: 1_700_000_123_999
      },
      new Date("2024-01-01T00:00:00.000Z")
    );

    expect(result).toEqual({
      max: 0,
      request: {
        From: 1_700_000_000_000,
        To: 1_700_000_123_000,
        QueryString: "*",
        Topics: [
          {
            TopicId: "topic-a"
          },
          {
            TopicId: "topic-b"
          }
        ],
        Limit: 100
      }
    });
  });

  it("同时传入 topic 和 topics 时会抛出结构化错误", () => {
    let caught: unknown;

    try {
      resolveQueryRequest({
        topic: "topic-1",
        topics: ["topic-2"],
        from: 1_700_000_000_000,
        to: 1_700_000_001_000
      });
    } catch (error: unknown) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(CliError);
    expect(caught).toMatchObject({
      code: "QUERY_TOPIC_CONFLICT",
      message: "不能同时传入 --topic 与 --topics"
    });
  });

  it("空白 topic 会抛出结构化错误", () => {
    let caught: unknown;

    try {
      resolveQueryRequest({
        topic: "   ",
        from: 1_700_000_000_000,
        to: 1_700_000_001_000
      });
    } catch (error: unknown) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(CliError);
    expect(caught).toMatchObject({
      code: "QUERY_TOPIC_INVALID",
      message: "--topic 不能为空白"
    });
  });

  it("多个 topic 配合 max 自动翻页时会抛出结构化错误", () => {
    let caught: unknown;

    try {
      resolveQueryRequest({
        topics: ["topic-a", "topic-b"],
        from: 1_700_000_000_000,
        to: 1_700_000_001_000,
        max: 1
      });
    } catch (error: unknown) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(CliError);
    expect(caught).toMatchObject({
      code: "QUERY_TOPICS_PAGINATION_UNSUPPORTED",
      message: "多主题查询暂不支持自动翻页，请不要同时传入 --topics 和 --max"
    });
  });

  it.each([
    ["limit", { limit: 0 }, "QUERY_LIMIT_INVALID", "--limit 必须是正整数"],
    ["max", { max: 0 }, "QUERY_MAX_INVALID", "--max 必须是正整数"]
  ])("%s 为 0 时会抛出结构化错误", (_name, partialInput, code, message) => {
    let caught: unknown;

    try {
      resolveQueryRequest({
        from: 1_700_000_000_000,
        to: 1_700_000_001_000,
        ...partialInput
      });
    } catch (error: unknown) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(CliError);
    expect(caught).toMatchObject({
      code,
      message
    });
  });
});
