import type { APMInstanceSummary, CommandSuccessShape, QuerySource } from "../types.js";

export interface InstancesCommandRunner {
  listInstances(): Promise<{
    items: APMInstanceSummary[];
    requestId?: string;
  }>;
}

export interface InstancesCommandOptions {
  source: QuerySource;
}

export async function runInstancesCommand(
  client: InstancesCommandRunner,
  options: InstancesCommandOptions
): Promise<CommandSuccessShape<{ totalCount: number; items: APMInstanceSummary[] }>> {
  const result = await client.listInstances();
  return {
    ok: true,
    command: "instances",
    source: options.source,
    request: {},
    data: {
      totalCount: result.items.length,
      items: result.items
    },
    requestId: result.requestId
  };
}
