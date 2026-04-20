import { resolveInstanceSelection } from "../domain/instance-resolution.js";
import { readFile } from "node:fs/promises";
import type { APMClient } from "../apm-client.js";
import type { CommandSuccessShape, QuerySource, SearchRequest } from "../types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toSearchRequest(value: unknown): SearchRequest {
  if (!isRecord(value)) {
    throw new Error("原始请求体必须是对象");
  }

  const request: SearchRequest = {
    InstanceId: typeof value.InstanceId === "string" ? value.InstanceId : "",
    StartTime: typeof value.StartTime === "number" ? value.StartTime : 0,
    EndTime: typeof value.EndTime === "number" ? value.EndTime : 0
  };

  if (typeof value.BusinessName === "string") {
    request.BusinessName = value.BusinessName;
  }
  if (Array.isArray(value.Filters)) {
    request.Filters = value.Filters.filter(isRecord).map((item) => ({
      Key: typeof item.Key === "string" ? item.Key : "",
      Type: typeof item.Type === "string" ? item.Type : "",
      Value: typeof item.Value === "string" ? item.Value : ""
    }));
  }
  if (typeof value.Limit === "number") {
    request.Limit = value.Limit;
  }
  if (typeof value.Offset === "number") {
    request.Offset = value.Offset;
  }
  if (isRecord(value.OrderBy)) {
    const key = value.OrderBy.Key;
    const order = value.OrderBy.Value;
    if (
      (key === "startTime" || key === "endTime" || key === "duration") &&
      (order === "asc" || order === "desc")
    ) {
      request.OrderBy = {
        Key: key,
        Value: order
      };
    }
  }

  if (!request.StartTime || !request.EndTime) {
    throw new Error("原始请求体缺少必填字段：StartTime / EndTime");
  }

  return request;
}

export interface RawCommandOptions {
  source: QuerySource;
  instanceId?: string;
  businessName?: string;
  requestJson?: string;
  requestFile?: string;
}

export async function runRawCommand(
  client: APMClient,
  options: RawCommandOptions
): Promise<CommandSuccessShape<unknown>> {
  const rawInput = options.requestJson
    ? options.requestJson
    : options.requestFile
      ? await readFile(options.requestFile, "utf8")
      : "";

  if (!rawInput) {
    throw new Error("必须传入 --request-json 或 --request-file");
  }

  const request = toSearchRequest(JSON.parse(rawInput));
  if (options.instanceId || !request.InstanceId) {
    const selected = await resolveInstanceSelection({
      config: client.getConfig(),
      instanceId: options.instanceId,
      businessName: options.businessName,
      listInstances: async () => (await client.listInstances()).items
    });
    request.InstanceId = selected.instanceId;
    request.BusinessName = options.businessName ?? request.BusinessName ?? selected.businessName;
  } else if (options.businessName) {
    request.BusinessName = options.businessName;
  } else if (!request.BusinessName && client.getConfig().businessName) {
    request.BusinessName = client.getConfig().businessName;
  }

  const data = await client.raw(options.source, request);
  const requestId =
    typeof data === "object" && data !== null && "RequestId" in data && typeof data.RequestId === "string"
      ? data.RequestId
      : undefined;

  return {
    ok: true,
    command: "raw",
    source: options.source,
    request,
    data,
    requestId
  };
}
