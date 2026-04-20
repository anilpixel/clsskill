import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runRawCommand } from "../src/commands/raw.js";
import type { AppConfig, QuerySource } from "../src/types.js";

const baseConfig: AppConfig = {
  secretId: "sid",
  secretKey: "skey",
  region: "ap-shanghai",
  businessName: undefined,
  instanceId: undefined
};

describe("runRawCommand", () => {
  it("命令行 instanceId 和 businessName 要覆盖原始请求中的旧值", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "apm-trace-raw-"));
    const requestFile = join(tempDir, "request.json");

    await writeFile(
      requestFile,
      JSON.stringify({
        InstanceId: "apm-old",
        BusinessName: "legacy",
        StartTime: 1710000000,
        EndTime: 1710000600
      }),
      "utf8"
    );

    const capturedRequests: unknown[] = [];
    const result = await runRawCommand(
      {
        getConfig() {
          return baseConfig;
        },
        async listInstances() {
          return {
            items: [
              {
                instanceId: "apm-auto",
                name: "auto",
                region: "ap-shanghai",
                status: 2
              }
            ]
          };
        },
        async raw(_source: QuerySource, request) {
          capturedRequests.push(request);
          return {
            RequestId: "req-1",
            echoedRequest: request
          };
        }
      },
      {
        source: "apm",
        instanceId: "apm-cli",
        businessName: "taw",
        requestFile
      }
    );

    expect(capturedRequests).toEqual([
      {
        InstanceId: "apm-cli",
        BusinessName: "taw",
        StartTime: 1710000000,
        EndTime: 1710000600
      }
    ]);

    expect(result).toEqual({
      ok: true,
      command: "raw",
      source: "apm",
      request: {
        InstanceId: "apm-cli",
        BusinessName: "taw",
        StartTime: 1710000000,
        EndTime: 1710000600
      },
      data: {
        RequestId: "req-1",
        echoedRequest: {
          InstanceId: "apm-cli",
          BusinessName: "taw",
          StartTime: 1710000000,
          EndTime: 1710000600
        }
      },
      requestId: "req-1"
    });
  });
});
