import { createSdkClient, type ClsSdkClientLike } from "./sdk-client.js";
import { CliError } from "./config.js";
import type {
  DescribeLogContextRequest,
  DescribeLogContextResponse,
  SearchLogRequest,
  SearchLogResponse
} from "tencentcloud-sdk-nodejs-cls/tencentcloud/services/cls/v20201016/cls_models.js";
import type {
  DescribeTopicsRequest,
  DescribeTopicsResponse
} from "./domain/topic-filters.js";
import type { AppConfig } from "./types.js";

export type TopicsCommandResult = DescribeTopicsResponse;
export type QueryCommandResult = SearchLogResponse;
export type ContextCommandResult = DescribeLogContextResponse;

export class ClsClient {
  private readonly sdkClient: ClsSdkClientLike;

  constructor(private readonly config: AppConfig, sdkClient?: ClsSdkClientLike) {
    this.sdkClient = sdkClient ?? createSdkClient(config);
  }

  getConfig(): AppConfig {
    return this.config;
  }

  async topics(request: DescribeTopicsRequest): Promise<TopicsCommandResult> {
    if (!this.sdkClient.describeTopics) {
      throw new CliError("CLS_SDK_NOT_IMPLEMENTED", "CLS SDK 尚未接入");
    }

    return this.sdkClient.describeTopics(request);
  }

  async query(request: SearchLogRequest): Promise<QueryCommandResult> {
    if (!this.sdkClient.searchLog) {
      throw new CliError("CLS_SDK_NOT_IMPLEMENTED", "CLS SDK 尚未接入");
    }

    return this.sdkClient.searchLog(request);
  }

  async context(request: DescribeLogContextRequest): Promise<ContextCommandResult> {
    if (!this.sdkClient.describeLogContext) {
      throw new CliError("CLS_SDK_NOT_IMPLEMENTED", "CLS SDK 尚未接入");
    }

    return this.sdkClient.describeLogContext(request);
  }
}
