import type {
  DescribeTopicsRequest,
  DescribeTopicsResponse
} from "../domain/topic-filters.js";

export interface TopicsGatewayClient {
  DescribeTopics(request: DescribeTopicsRequest): Promise<DescribeTopicsResponse>;
}

export interface TopicsGateway {
  describeTopics(request: DescribeTopicsRequest): Promise<DescribeTopicsResponse>;
}

export function createTopicsGateway(client: TopicsGatewayClient): TopicsGateway {
  return {
    async describeTopics(request: DescribeTopicsRequest): Promise<DescribeTopicsResponse> {
      return client.DescribeTopics(request);
    }
  };
}
