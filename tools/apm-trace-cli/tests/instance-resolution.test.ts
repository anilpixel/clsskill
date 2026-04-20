import { describe, expect, it } from "vitest";
import { CliError } from "../src/config.js";
import { resolveInstanceSelection } from "../src/domain/instance-resolution.js";
import type { AppConfig, APMInstanceSummary } from "../src/types.js";

const baseConfig: AppConfig = {
  secretId: "sid",
  secretKey: "skey",
  region: "ap-shanghai",
  instanceId: undefined,
  businessName: undefined
};

describe("resolveInstanceSelection", () => {
  it("优先使用命令行传入的 instanceId", async () => {
    const resolved = await resolveInstanceSelection({
      config: baseConfig,
      instanceId: "apm-cli",
      listInstances: async () => {
        throw new Error("不该调用");
      }
    });

    expect(resolved).toEqual({
      instanceId: "apm-cli",
      businessName: undefined,
      instances: undefined
    });
  });

  it("在配置里已有 instanceId 时直接使用", async () => {
    const resolved = await resolveInstanceSelection({
      config: {
        ...baseConfig,
        instanceId: "apm-env",
        businessName: "taw"
      },
      listInstances: async () => {
        throw new Error("不该调用");
      }
    });

    expect(resolved).toEqual({
      instanceId: "apm-env",
      businessName: "taw",
      instances: undefined
    });
  });

  it("未显式提供时，只有一个实例则自动选择", async () => {
    const instances: APMInstanceSummary[] = [
      {
        instanceId: "apm-auto",
        name: "prod",
        region: "ap-shanghai",
        status: 2
      }
    ];

    const resolved = await resolveInstanceSelection({
      config: baseConfig,
      listInstances: async () => instances
    });

    expect(resolved).toEqual({
      instanceId: "apm-auto",
      businessName: undefined,
      instances
    });
  });

  it("多个实例时返回结构化错误，让调用方显式选择", async () => {
    await expect(
      resolveInstanceSelection({
        config: baseConfig,
        listInstances: async () => [
          {
            instanceId: "apm-1",
            name: "prod",
            region: "ap-shanghai",
            status: 2
          },
          {
            instanceId: "apm-2",
            name: "staging",
            region: "ap-shanghai",
            status: 2
          }
        ]
      })
    ).rejects.toMatchObject<CliError>({
      code: "INSTANCE_SELECTION_REQUIRED"
    });
  });
});
