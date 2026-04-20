import { describe, expect, it } from "vitest";
import { createInstancesGateway } from "../src/gateways/instances-gateway.js";

describe("instances gateway", () => {
  it("规范化实例列表返回", async () => {
    const gateway = createInstancesGateway({
      async DescribeApmInstances() {
        return {
          RequestId: "req-ins",
          Instances: [
            {
              InstanceId: "apm-1",
              Name: "prod",
              Region: "ap-shanghai",
              Status: 2
            },
            {
              Name: "invalid-no-id"
            }
          ]
        };
      }
    });

    const result = await gateway.listInstances();

    expect(result).toEqual({
      requestId: "req-ins",
      items: [
        {
          instanceId: "apm-1",
          name: "prod",
          region: "ap-shanghai",
          status: 2
        }
      ]
    });
  });
});
