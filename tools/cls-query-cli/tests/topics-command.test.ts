import { describe, expect, it } from "vitest";
import { ClsClient } from "../src/cls-client.js";
import { runCli } from "../src/cli-runner.js";
import { runTopicsCommand } from "../src/commands/topics.js";
import type { ClsSdkClientLike } from "../src/sdk-client.js";

describe("runTopicsCommand", () => {
  it("会创建客户端、调用 DescribeTopics，并返回结构化成功结果", async () => {
    let createClientCalled = 0;
    let createClientRegion: string | undefined;
    let describeTopicsCalled = 0;
    let describeTopicsRequest: unknown;

    const sdkClient: ClsSdkClientLike = {
      async describeTopics(request) {
        describeTopicsCalled += 1;
        describeTopicsRequest = request;
        return {
          Topics: [
            {
              TopicId: "topic-1",
              TopicName: "app-log",
              LogsetId: "logset-1"
            }
          ],
          TotalCount: 1,
          RequestId: "request-1"
        };
      },
      async request() {
        throw new Error("不应调用通用 request");
      }
    };

    const result = await runTopicsCommand(
      {
        region: "ap-guangzhou",
        topicName: "app-log",
        logsetId: "logset-1",
        limit: 20,
        offset: 0
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
    expect(createClientRegion).toBe("ap-guangzhou");
    expect(describeTopicsCalled).toBe(1);
    expect(describeTopicsRequest).toEqual({
      Filters: [
        {
          Key: "topicName",
          Values: ["app-log"]
        },
        {
          Key: "logsetId",
          Values: ["logset-1"]
        }
      ],
      Limit: 20,
      Offset: 0
    });
    expect(result).toEqual({
      ok: true,
      command: "topics",
      request: {
        Filters: [
          {
            Key: "topicName",
            Values: ["app-log"]
          },
          {
            Key: "logsetId",
            Values: ["logset-1"]
          }
        ],
        Limit: 20,
        Offset: 0
      },
      data: {
        totalCount: 1,
        items: [
          {
            TopicId: "topic-1",
            TopicName: "app-log",
            LogsetId: "logset-1"
          }
        ]
      }
    });
  });
});

describe("topics CLI", () => {
  it("会把 topics 参数透传到 runTopicsCommand 并输出结构化 JSON", async () => {
    const outputs: string[] = [];
    let createClientCalled = 0;
    let describeTopicsCalled = 0;

    const exitCode = await runCli(
      [
        "node",
        "cls-query",
        "topics",
        "--region",
        "ap-guangzhou",
        "--topic-name",
        "app-log",
        "--logset-name",
        "prod-logset",
        "--logset-id",
        "logset-001",
        "--limit",
        "15",
        "--offset",
        "3"
      ],
      {
        writeJson(value) {
          outputs.push(JSON.stringify(value));
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
            {
              async describeTopics(request) {
                describeTopicsCalled += 1;
                expect(request).toEqual({
                  Filters: [
                    {
                      Key: "topicName",
                      Values: ["app-log"]
                    },
                    {
                      Key: "logsetName",
                      Values: ["prod-logset"]
                    },
                    {
                      Key: "logsetId",
                      Values: ["logset-001"]
                    }
                  ],
                  Limit: 15,
                  Offset: 3
                });

                return {
                  Topics: [],
                  TotalCount: 0,
                  RequestId: "request-2"
                };
              },
              async request() {
                throw new Error("不应调用通用 request");
              }
            }
          );
        }
      }
    );

    expect(exitCode).toBe(0);
    expect(createClientCalled).toBe(1);
    expect(describeTopicsCalled).toBe(1);
    expect(outputs).toHaveLength(1);
    expect(JSON.parse(outputs[0])).toEqual({
      ok: true,
      command: "topics",
      request: {
        Filters: [
          {
            Key: "topicName",
            Values: ["app-log"]
          },
          {
            Key: "logsetName",
            Values: ["prod-logset"]
          },
          {
            Key: "logsetId",
            Values: ["logset-001"]
          }
        ],
        Limit: 15,
        Offset: 3
      },
      data: {
        totalCount: 0,
        items: []
      }
    });
  });

  it("--limit abc 时返回结构化的 CLI_USAGE_ERROR", async () => {
    const outputs: string[] = [];
    let createClientCalled = 0;

    const exitCode = await runCli(["node", "cls-query", "topics", "--limit", "abc"], {
      writeJson(value) {
        outputs.push(JSON.stringify(value));
      },
      createClient() {
        createClientCalled += 1;
        throw new Error("不应创建 client");
      }
    });

    expect(exitCode).toBe(1);
    expect(createClientCalled).toBe(0);
    expect(outputs).toHaveLength(1);
    expect(JSON.parse(outputs[0])).toMatchObject({
      ok: false,
      error: {
        code: "CLI_USAGE_ERROR",
        message: expect.stringContaining("abc")
      }
    });
  });
});
