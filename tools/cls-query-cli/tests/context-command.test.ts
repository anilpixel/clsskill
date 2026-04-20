import { describe, expect, it } from "vitest";
import { ClsClient } from "../src/cls-client.js";
import { runCli } from "../src/cli-runner.js";
import { runContextCommand } from "../src/commands/context.js";
import { resolveContextRequest } from "../src/domain/context-request.js";
import type { ClsSdkClientLike } from "../src/sdk-client.js";

describe("resolveContextRequest", () => {
  it("会把 SearchLog 返回的毫秒时间戳转换为 CLS 上下文接口要求的北京时间格式", () => {
    const resolved = resolveContextRequest({
      topic: "topic-1",
      btime: "1776416550035",
      pkgId: "pkg-1",
      pkgLogId: "65536"
    });

    expect(resolved).toEqual({
      request: {
        TopicId: "topic-1",
        BTime: "2026-04-17 17:02:30.035",
        PkgId: "pkg-1",
        PkgLogId: 65536
      }
    });
  });

  it("会拒绝带尾巴的脏 PkgLogId 输入", () => {
    let caught: unknown;

    try {
      resolveContextRequest({
        topic: "topic-1",
        btime: "2024-07-03 12:34:56.789",
        pkgId: "pkg-1",
        pkgLogId: "65536x"
      });
    } catch (error: unknown) {
      caught = error;
    }

    expect(caught).toMatchObject({
      code: "CONTEXT_PKG_LOG_ID_INVALID",
      message: "PkgLogId 必须是正整数"
    });
  });

  it("会拒绝科学计数法形式的 PkgLogId 输入", () => {
    let caught: unknown;

    try {
      resolveContextRequest({
        topic: "topic-1",
        btime: "2024-07-03 12:34:56.789",
        pkgId: "pkg-1",
        pkgLogId: "1e5"
      });
    } catch (error: unknown) {
      caught = error;
    }

    expect(caught).toMatchObject({
      code: "CONTEXT_PKG_LOG_ID_INVALID",
      message: "PkgLogId 必须是正整数"
    });
  });
});

describe("runContextCommand", () => {
  it("会把位置参数与选项映射为 DescribeLogContext 请求，并输出结构化结果", async () => {
    let createClientCalled = 0;
    let createClientRegion: string | undefined;
    let describeLogContextCalled = 0;
    let receivedRequest: unknown;

    const sdkClient: ClsSdkClientLike = {
      async describeLogContext(request) {
        describeLogContextCalled += 1;
        receivedRequest = request;
        return {
          LogContextInfos: [
            {
              PkgId: "pkg-1",
              PkgLogId: 65536,
              BTime: 1_720_000_000_000,
              Content: "first line"
            },
            {
              PkgId: "pkg-1",
              PkgLogId: 65537,
              BTime: 1_720_000_000_001,
              Content: "second line"
            }
          ],
          PrevOver: false,
          NextOver: true,
          RequestId: "request-1"
        };
      }
    };

    const result = await runContextCommand(
      {
        pkgId: "pkg-1",
        pkgLogId: "65536",
        topic: "topic-1",
        btime: "2024-07-03 12:34:56.789",
        prevLogs: 3,
        nextLogs: 5,
        query: "level:ERROR",
        from: 1_720_000_000_000,
        to: 1_720_000_123_000,
        region: "ap-shanghai"
      },
      {
        createClient(config) {
          createClientCalled += 1;
          createClientRegion = config.region;
          return new ClsClient(
            {
              secretId: "test-secret-id",
              secretKey: "test-secret-key",
              region: config.region
            },
            sdkClient
          );
        }
      }
    );

    expect(createClientCalled).toBe(1);
    expect(createClientRegion).toBe("ap-shanghai");
    expect(describeLogContextCalled).toBe(1);
    expect(receivedRequest).toEqual({
      TopicId: "topic-1",
      BTime: "2024-07-03 12:34:56.789",
      PkgId: "pkg-1",
      PkgLogId: 65536,
      PrevLogs: 3,
      NextLogs: 5,
      Query: "level:ERROR",
      From: 1_720_000_000_000,
      To: 1_720_000_123_000
    });
    expect(result).toEqual({
      ok: true,
      command: "context",
      request: {
        TopicId: "topic-1",
        BTime: "2024-07-03 12:34:56.789",
        PkgId: "pkg-1",
        PkgLogId: 65536,
        PrevLogs: 3,
        NextLogs: 5,
        Query: "level:ERROR",
        From: 1_720_000_000_000,
        To: 1_720_000_123_000
      },
      data: {
        items: [
          {
            PkgId: "pkg-1",
            PkgLogId: 65536,
            BTime: 1_720_000_000_000,
            Content: "first line"
          },
          {
            PkgId: "pkg-1",
            PkgLogId: 65537,
            BTime: 1_720_000_000_001,
            Content: "second line"
          }
        ],
        prevOver: false,
        nextOver: true,
        requestId: "request-1"
      }
    });
  });
});

describe("context CLI", () => {
  it("会通过 CLI 调用 DescribeLogContext，并输出结构化 JSON", async () => {
    const outputs: string[] = [];
    let describeLogContextCalled = 0;
    let requestCalled = 0;

    const sdkClient: ClsSdkClientLike = {
      async describeLogContext(request) {
        describeLogContextCalled += 1;
        expect(request).toEqual({
          TopicId: "topic-1",
          BTime: "2024-07-03 12:34:56.789",
          PkgId: "pkg-1",
          PkgLogId: 65536
        });
        return {
          LogContextInfos: [
            {
              PkgId: "pkg-1",
              PkgLogId: 65536,
              BTime: 1_720_000_000_000,
              Content: "line-1"
            }
          ],
          PrevOver: true,
          NextOver: false,
          RequestId: "request-1"
        };
      }
    };

    const exitCode = await runCli(
      [
        "node",
        "cls-query",
        "context",
        "pkg-1",
        "65536",
        "--topic",
        "topic-1",
        "--btime",
        "2024-07-03 12:34:56.789",
        "--region",
        "ap-shanghai"
      ],
      {
        writeJson(value) {
          outputs.push(JSON.stringify(value));
        },
        createClient(config) {
          requestCalled += 1;
          expect(config).toEqual({ region: "ap-shanghai" });
          return new ClsClient(
            {
              secretId: "test-secret-id",
              secretKey: "test-secret-key",
              region: config.region
            },
            sdkClient
          );
        }
      }
    );

    expect(exitCode).toBe(0);
    expect(requestCalled).toBe(1);
    expect(describeLogContextCalled).toBe(1);
    expect(outputs).toHaveLength(1);
    expect(JSON.parse(outputs[0])).toEqual({
      ok: true,
      command: "context",
      request: {
        TopicId: "topic-1",
        BTime: "2024-07-03 12:34:56.789",
        PkgId: "pkg-1",
        PkgLogId: 65536
      },
      data: {
        items: [
          {
            PkgId: "pkg-1",
            PkgLogId: 65536,
            BTime: 1_720_000_000_000,
            Content: "line-1"
          }
        ],
        prevOver: true,
        nextOver: false,
        requestId: "request-1"
      }
    });
  });
});
