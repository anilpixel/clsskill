import type {
  DescribeLogContextRequest,
  DescribeLogContextResponse
} from "tencentcloud-sdk-nodejs-cls/tencentcloud/services/cls/v20201016/cls_models.js";

export interface ContextGatewayClient {
  DescribeLogContext(request: DescribeLogContextRequest): Promise<DescribeLogContextResponse>;
}

export interface ContextGateway {
  describeLogContext(request: DescribeLogContextRequest): Promise<DescribeLogContextResponse>;
}

export function createContextGateway(client: ContextGatewayClient): ContextGateway {
  return {
    async describeLogContext(
      request: DescribeLogContextRequest
    ): Promise<DescribeLogContextResponse> {
      return client.DescribeLogContext(request);
    }
  };
}
