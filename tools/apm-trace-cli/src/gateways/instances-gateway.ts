import { normalizeSdkError } from "../sdk-client.js";
import type { InstancesResult } from "../apm-client.js";
import type { SdkClientLike } from "../sdk-client.js";

export interface InstancesGateway {
  listInstances(): Promise<InstancesResult>;
}

export function createInstancesGateway(client: Pick<SdkClientLike, "DescribeApmInstances">): InstancesGateway {
  return {
    async listInstances() {
      try {
        const response = await client.DescribeApmInstances({
          AllRegionsFlag: 0
        });
        return {
          items: (response.Instances ?? [])
            .filter((instance): instance is { InstanceId?: string; Name?: string; Region?: string; Status?: number } => {
              return typeof instance === "object" && instance !== null && typeof instance.InstanceId === "string";
            })
            .map((instance) => ({
              instanceId: instance.InstanceId ?? "",
              name: instance.Name ?? null,
              region: instance.Region ?? null,
              status: typeof instance.Status === "number" ? instance.Status : null
            })),
          requestId: response.RequestId
        };
      } catch (error) {
        normalizeSdkError(error);
      }
    }
  };
}
