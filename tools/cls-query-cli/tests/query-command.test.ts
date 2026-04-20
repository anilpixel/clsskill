import { describe, expect, it } from "vitest";
import { ClsClient } from "../src/cls-client.js";
import { runCli } from "../src/cli-runner.js";
import type { ClsSdkClientLike } from "../src/sdk-client.js";

describe("query CLI", () => {
  it("会调用 SearchLog、自动翻页，并默认输出 JSON 渲染结果", async () => {
    const outputs: unknown[] = [];
    let createClientCalled = 0;
    let searchLogCalled = 0;
    const requests: unknown[] = [];

    const sdkClient: ClsSdkClientLike = {
      async searchLog(request) {
        searchLogCalled += 1;
        requests.push(request);

        if (searchLogCalled === 1) {
          expect(request).toEqual({
            From: 900_000,
            To: 1_800_000,
            QueryString: "level:ERROR",
            TopicId: "topic-1",
            Sort: "desc",
            Limit: 2
          });

          return {
            Results: [
              {
                PkgId: "pkg-1"
              },
              {
                PkgId: "pkg-2"
              }
            ],
            ListOver: false,
            Analysis: false,
            Context: "ctx-1",
            RequestId: "request-1"
          };
        }

        expect(request).toEqual({
          From: 900_000,
          To: 1_800_000,
          QueryString: "level:ERROR",
          TopicId: "topic-1",
          Sort: "desc",
          Limit: 1,
          Context: "ctx-1"
        });

        return {
          Results: [
            {
              PkgId: "pkg-3"
            }
          ],
          ListOver: true,
          Analysis: false,
          Context: "ctx-2",
          RequestId: "request-2"
        };
      },
      async request() {
        throw new Error("不应调用通用 request");
      }
    };

    const exitCode = await runCli(
      [
        "node",
        "cls-query",
        "query",
        "--region",
        "ap-guangzhou",
        "-q",
        "level:ERROR",
        "-t",
        "topic-1",
        "--last",
        "15m",
        "--limit",
        "2",
        "--max",
        "3",
        "--sort",
        "desc"
      ],
      {
        now: new Date("1970-01-01T00:30:00.000Z"),
        writeOutput(value) {
          outputs.push(value);
        },
        createClient(config) {
          createClientCalled += 1;
          expect(config).toEqual({ region: "ap-guangzhou" });
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
    expect(createClientCalled).toBe(1);
    expect(searchLogCalled).toBe(2);
    expect(requests).toHaveLength(2);
    expect(outputs).toHaveLength(1);
    expect(outputs[0]).toEqual({
      kind: "stdout",
      format: "json",
      content: `${JSON.stringify(
          {
            ok: true,
            command: "query",
            request: {
              From: 900_000,
              To: 1_800_000,
              QueryString: "level:ERROR",
              Limit: 2,
              TopicId: "topic-1",
              Sort: "desc"
            },
            data: {
            items: [
              {
                PkgId: "pkg-1"
              },
              {
                PkgId: "pkg-2"
              },
              {
                PkgId: "pkg-3"
              }
            ],
            listOver: true,
            context: "ctx-2",
            analysis: false,
            requestId: "request-2"
          }
        },
        null,
        2
      )}\n`
    });
  });

  it("传入 --output csv 时会走 CSV 渲染结果", async () => {
    const outputs: unknown[] = [];

    const sdkClient: ClsSdkClientLike = {
      async searchLog(request) {
        expect(request).toEqual({
          From: 900_000,
          To: 1_800_000,
          QueryString: "level:ERROR",
          TopicId: "topic-1",
          Limit: 100
        });

        return {
          Results: [
            {
              PkgId: "pkg-1"
            }
          ],
          ListOver: true,
          Analysis: false,
          Context: null,
          RequestId: "request-1"
        };
      },
      async request() {
        throw new Error("不应调用通用 request");
      }
    };

    const exitCode = await runCli(
      [
        "node",
        "cls-query",
        "query",
        "-q",
        "level:ERROR",
        "-t",
        "topic-1",
        "--last",
        "15m",
        "--output",
        "csv"
      ],
      {
        now: new Date("1970-01-01T00:30:00.000Z"),
        writeOutput(value) {
          outputs.push(value);
        },
        createClient() {
          return new ClsClient(
            {
              secretId: "test-secret-id",
              secretKey: "test-secret-key"
            },
            sdkClient
          );
        }
      }
    );

    expect(exitCode).toBe(0);
    expect(outputs).toHaveLength(1);
    expect(outputs[0]).toMatchObject({
      kind: "stdout",
      format: "csv",
      content: expect.stringContaining("\"ok\",\"command\",\"request\",\"data\"")
    });
  });

  it("传入 --output 文件路径时会返回文件渲染结果", async () => {
    const outputs: unknown[] = [];

    const sdkClient: ClsSdkClientLike = {
      async searchLog(request) {
        expect(request).toEqual({
          From: 900_000,
          To: 1_800_000,
          QueryString: "level:ERROR",
          TopicId: "topic-1",
          Limit: 100
        });

        return {
          Results: [
            {
              PkgId: "pkg-1"
            }
          ],
          ListOver: true,
          Analysis: false,
          Context: null,
          RequestId: "request-1"
        };
      },
      async request() {
        throw new Error("不应调用通用 request");
      }
    };

    const exitCode = await runCli(
      [
        "node",
        "cls-query",
        "query",
        "-q",
        "level:ERROR",
        "-t",
        "topic-1",
        "--last",
        "15m",
        "--output",
        "/tmp/cls-query-output.json"
      ],
      {
        now: new Date("1970-01-01T00:30:00.000Z"),
        writeOutput(value) {
          outputs.push(value);
        },
        createClient() {
          return new ClsClient(
            {
              secretId: "test-secret-id",
              secretKey: "test-secret-key"
            },
            sdkClient
          );
        }
      }
    );

    expect(exitCode).toBe(0);
    expect(outputs).toHaveLength(1);
    expect(outputs[0]).toMatchObject({
      kind: "file",
      format: "json",
      path: "/tmp/cls-query-output.json",
      content: `${JSON.stringify(
          {
            ok: true,
            command: "query",
            request: {
              From: 900_000,
              To: 1_800_000,
              QueryString: "level:ERROR",
              Limit: 100,
              TopicId: "topic-1"
            },
            data: {
            items: [
              {
                PkgId: "pkg-1"
              }
            ],
            listOver: true,
            context: null,
            analysis: false,
            requestId: "request-1"
          }
        },
        null,
        2
      )}\n`
    });
  });

  it("传入 --topics 且 --max > 0 时会返回结构化错误并拒绝创建 client", async () => {
    const outputs: string[] = [];
    let createClientCalled = 0;

    const exitCode = await runCli(
      [
        "node",
        "cls-query",
        "query",
        "--topics",
        "topic-a,topic-b",
        "--from",
        "1000",
        "--to",
        "2000",
        "--max",
        "1"
      ],
      {
        writeJson(value) {
          outputs.push(JSON.stringify(value));
        },
        createClient() {
          createClientCalled += 1;
          throw new Error("不应创建 client");
        }
      }
    );

    expect(exitCode).toBe(1);
    expect(createClientCalled).toBe(0);
    expect(outputs).toHaveLength(1);
    expect(JSON.parse(outputs[0])).toEqual({
      ok: false,
      error: {
        code: "QUERY_TOPICS_PAGINATION_UNSUPPORTED",
        message: "多主题查询暂不支持自动翻页，请不要同时传入 --topics 和 --max"
      }
    });
  });

  it("传入空白 --topic 时会返回结构化错误并拒绝创建 client", async () => {
    const outputs: string[] = [];
    let createClientCalled = 0;

    const exitCode = await runCli(
      [
        "node",
        "cls-query",
        "query",
        "--topic",
        "   ",
        "--from",
        "1000",
        "--to",
        "2000"
      ],
      {
        writeJson(value) {
          outputs.push(JSON.stringify(value));
        },
        createClient() {
          createClientCalled += 1;
          throw new Error("不应创建 client");
        }
      }
    );

    expect(exitCode).toBe(1);
    expect(createClientCalled).toBe(0);
    expect(outputs).toHaveLength(1);
    expect(JSON.parse(outputs[0])).toEqual({
      ok: false,
      error: {
        code: "QUERY_TOPIC_INVALID",
        message: "--topic 不能为空白"
      }
    });
  });
});
