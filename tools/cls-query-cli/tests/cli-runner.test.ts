import { readFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ClsClient } from "../src/cls-client.js";
import { loadConfig } from "../src/config.js";
import { runCli } from "../src/cli-runner.js";
import type { ClsSdkClientLike } from "../src/sdk-client.js";

describe("runCli", () => {
  it("--help 只显示帮助，不输出 JSON 错误", async () => {
    const outputs: string[] = [];

    const exitCode = await runCli(["node", "cls-query", "--help"], {
      writeJson(value) {
        outputs.push(JSON.stringify(value));
      },
      createClient() {
        throw new Error("不应创建 client");
      }
    });

    expect(exitCode).toBe(0);
    expect(outputs).toHaveLength(0);
  });

  it("context 缺少第二个位置参数时返回结构化 JSON 错误", async () => {
    const outputs: string[] = [];

    const exitCode = await runCli(["node", "cls-query", "context", "pkg-1"], {
      writeJson(value) {
        outputs.push(JSON.stringify(value));
      },
      createClient() {
        throw new Error("不应创建 client");
      }
    });

    expect(exitCode).toBe(1);
    expect(outputs).toHaveLength(1);
    expect(JSON.parse(outputs[0])).toEqual({
      ok: false,
      error: {
        code: "CLI_USAGE_ERROR",
        message: "missing required argument 'PkgLogId'"
      }
    });
  });

  it("未配置 region 时仍能加载配置", () => {
    const config = loadConfig({
      TENCENTCLOUD_SECRET_ID: "test-secret-id",
      TENCENTCLOUD_SECRET_KEY: "test-secret-key"
    });

    expect(config).toEqual({
      secretId: "test-secret-id",
      secretKey: "test-secret-key",
      region: undefined
    });
  });

  it("合法命令会调用 createClient 并输出结构化结果", async () => {
    let createClientCalled = 0;
    let describeLogContextCalled = 0;
    const outputs: string[] = [];

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
              Content: "context-item-1"
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
        "2024-07-03 12:34:56.789"
      ],
      {
        writeJson(value) {
          outputs.push(JSON.stringify(value));
        },
        createClient() {
          createClientCalled += 1;
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
    expect(createClientCalled).toBe(1);
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
            Content: "context-item-1"
          }
        ],
        prevOver: true,
        nextOver: false,
        requestId: "request-1"
      }
    });
  });

  it("query 的 --output 文件路径会写入目标文件", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "cls-query-cli-"));
    const outputPath = join(tempDir, "query-result.json");

    const sdkClient: ClsSdkClientLike = {
      async searchLog(request) {
        expect(request).toEqual({
          From: 1000,
          To: 2000,
          QueryString: "*",
          Limit: 100,
          TopicId: "topic-1"
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
        "-t",
        "topic-1",
        "--from",
        "1000",
        "--to",
        "2000",
        "--output",
        outputPath
      ],
      {
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
    expect(
      await readFile(outputPath, "utf8")
    ).toBe(
      `${JSON.stringify(
        {
          ok: true,
          command: "query",
          request: {
            From: 1000,
            To: 2000,
            QueryString: "*",
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
    );
  });
});
