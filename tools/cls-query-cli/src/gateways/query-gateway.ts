import type {
  SearchLogRequest,
  SearchLogResponse
} from "tencentcloud-sdk-nodejs-cls/tencentcloud/services/cls/v20201016/cls_models.js";

export interface QueryGatewayClient {
  SearchLog(request: SearchLogRequest): Promise<SearchLogResponse>;
}

export interface QueryGateway {
  searchLog(request: SearchLogRequest): Promise<SearchLogResponse>;
}

export function createQueryGateway(client: QueryGatewayClient): QueryGateway {
  return {
    async searchLog(request: SearchLogRequest): Promise<SearchLogResponse> {
      return client.SearchLog(request);
    }
  };
}
