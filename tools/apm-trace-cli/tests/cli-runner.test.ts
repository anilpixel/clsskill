import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli-runner.js";

describe("runCli", () => {
  it("help 输出不应被包装成错误 JSON", async () => {
    const outputs: string[] = [];

    const exitCode = await runCli(["node", "apm-trace", "--help"], {
      writeJson(value) {
        outputs.push(JSON.stringify(value));
      },
      createClient() {
        throw new Error("不该创建 client");
      }
    });

    expect(exitCode).toBe(0);
    expect(outputs).toHaveLength(0);
  });

  it("参数校验失败时返回结构化 JSON 错误", async () => {
    const outputs: string[] = [];

    const exitCode = await runCli(["node", "apm-trace", "get"], {
      writeJson(value) {
        outputs.push(JSON.stringify(value));
      },
      createClient() {
        throw new Error("不该创建 client");
      }
    });

    expect(exitCode).toBe(1);
    expect(outputs).toHaveLength(1);
    expect(JSON.parse(outputs[0])).toEqual({
      ok: false,
      error: {
        code: "CLI_USAGE_ERROR",
        message: "required option '--trace-id <traceId>' not specified"
      }
    });
  });
});
