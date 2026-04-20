import { describe, expect, it } from "vitest";
import { runInstancesCommand } from "../src/commands/instances.js";
import type { APMInstanceSummary, QuerySource } from "../src/types.js";

describe("runInstancesCommand", () => {
  it("返回可供 agent 消费的实例列表 JSON", async () => {
    const instances: APMInstanceSummary[] = [
      {
        instanceId: "apm-1",
        name: "prod",
        region: "ap-shanghai",
        status: 2
      }
    ];

    const result = await runInstancesCommand(
      {
        async listInstances() {
          return {
            items: instances
          };
        }
      },
      {
        source: "apm" as QuerySource
      }
    );

    expect(result).toEqual({
      ok: true,
      command: "instances",
      source: "apm",
      request: {},
      data: {
        totalCount: 1,
        items: instances
      },
      requestId: undefined
    });
  });
});
