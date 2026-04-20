import { apm } from "tencentcloud-sdk-nodejs-apm";
import { CliError } from "./config.js";
import type { AppConfig, SearchRequest, TencentSpan } from "./types.js";

export interface APMResponse {
  TotalCount?: number;
  Spans?: TencentSpan[];
  RequestId?: string;
}

export interface OTelResponse {
  TotalCount?: number;
  Spans?: string;
  RequestId?: string;
}

export interface InstanceResponse {
  Instances?: Array<{
    InstanceId?: string;
    Name?: string;
    Region?: string;
    Status?: number;
  }>;
  RequestId?: string;
}

export interface SdkClientLike {
  DescribeGeneralSpanList(request: SearchRequest): Promise<APMResponse>;
  DescribeGeneralOTSpanList(request: SearchRequest): Promise<OTelResponse>;
  DescribeApmInstances(request: {
    AllRegionsFlag?: number;
    InstanceName?: string;
    InstanceId?: string;
    InstanceIds?: string[];
  }): Promise<InstanceResponse>;
}

export function createSdkClient(config: AppConfig): SdkClientLike {
  return new apm.v20210622.Client({
    credential: {
      secretId: config.secretId,
      secretKey: config.secretKey
    },
    region: config.region,
    profile: {
      httpProfile: {
        endpoint: "apm.tencentcloudapi.com"
      }
    }
  });
}

export function normalizeSdkError(error: unknown): never {
  if (typeof error === "object" && error !== null) {
    const maybeError = error as { code?: unknown; message?: unknown; requestId?: unknown };
    throw new CliError(
      typeof maybeError.code === "string" ? maybeError.code : "APM_REQUEST_FAILED",
      typeof maybeError.message === "string" ? maybeError.message : "APM 请求失败",
      typeof maybeError.requestId === "string" ? maybeError.requestId : undefined
    );
  }

  throw new CliError("APM_REQUEST_FAILED", "APM 请求失败");
}
