import { cls } from "tencentcloud-sdk-nodejs-cls";
import { CliError } from "./config.js";
import type {
  DescribeLogContextRequest,
  DescribeLogContextResponse
} from "tencentcloud-sdk-nodejs-cls/tencentcloud/services/cls/v20201016/cls_models.js";
import type {
  DescribeTopicsRequest,
  DescribeTopicsResponse
} from "./domain/topic-filters.js";
import type { AppConfig } from "./types.js";
import {
  createContextGateway,
  type ContextGateway
} from "./gateways/context-gateway.js";
import { createTopicsGateway, type TopicsGateway } from "./gateways/topics-gateway.js";
import {
  createQueryGateway,
  type QueryGateway
} from "./gateways/query-gateway.js";
import type {
  SearchLogRequest,
  SearchLogResponse
} from "tencentcloud-sdk-nodejs-cls/tencentcloud/services/cls/v20201016/cls_models.js";

export interface ClsSdkClientLike {
  describeTopics?: (request: DescribeTopicsRequest) => Promise<DescribeTopicsResponse>;
  searchLog?: (request: SearchLogRequest) => Promise<SearchLogResponse>;
  describeLogContext?: (request: DescribeLogContextRequest) => Promise<DescribeLogContextResponse>;
  request?: <TResponse>(
    operation: string,
    payload: Readonly<Record<string, unknown>>
  ) => Promise<TResponse>;
}

export function createSdkClient(config: AppConfig): ClsSdkClientLike {
  const client = new cls.v20201016.Client({
    credential: {
      secretId: config.secretId,
      secretKey: config.secretKey
    },
    region: config.region
  });
  const topicsGateway: TopicsGateway = createTopicsGateway(client);
  const queryGateway: QueryGateway = createQueryGateway(client);
  const contextGateway: ContextGateway = createContextGateway(client);

  return {
    async describeTopics(request: DescribeTopicsRequest): Promise<DescribeTopicsResponse> {
      return topicsGateway.describeTopics(request);
    },
    async searchLog(request: SearchLogRequest): Promise<SearchLogResponse> {
      return queryGateway.searchLog(request);
    },
    async describeLogContext(
      request: DescribeLogContextRequest
    ): Promise<DescribeLogContextResponse> {
      return contextGateway.describeLogContext(request);
    },
    async request<TResponse>(_operation: string, _payload: Readonly<Record<string, unknown>>) {
      throw new CliError("CLS_SDK_NOT_IMPLEMENTED", "CLS SDK 尚未接入");
    }
  };
}
