import { CliError } from "../config.js";
import type { APMInstanceSummary, AppConfig } from "../types.js";

export interface ResolveInstanceSelectionInput {
  config: AppConfig;
  instanceId?: string;
  businessName?: string;
  listInstances: () => Promise<APMInstanceSummary[]>;
}

export interface ResolvedInstanceSelection {
  instanceId: string;
  businessName?: string;
  instances?: APMInstanceSummary[];
}

export async function resolveInstanceSelection(
  input: ResolveInstanceSelectionInput
): Promise<ResolvedInstanceSelection> {
  if (input.instanceId) {
    return {
      instanceId: input.instanceId,
      businessName: input.businessName ?? input.config.businessName,
      instances: undefined
    };
  }

  if (input.config.instanceId) {
    return {
      instanceId: input.config.instanceId,
      businessName: input.businessName ?? input.config.businessName,
      instances: undefined
    };
  }

  const instances = await input.listInstances();

  if (instances.length === 0) {
    throw new CliError("INSTANCE_NOT_FOUND", "当前地域下未查询到任何 APM 实例");
  }

  if (instances.length === 1) {
    return {
      instanceId: instances[0].instanceId,
      businessName: input.businessName ?? input.config.businessName,
      instances
    };
  }

  throw new CliError(
    "INSTANCE_SELECTION_REQUIRED",
    `检测到多个 APM 实例，请显式传入 --instance-id。可选实例：${instances
      .map((instance) => `${instance.instanceId}${instance.name ? `(${instance.name})` : ""}`)
      .join(", ")}`
  );
}
