import { createInstancesGateway } from "./gateways/instances-gateway.js";
import { createTraceGateway, type TraceGateway } from "./gateways/trace-gateway.js";
import { createSdkClient, type SdkClientLike } from "./sdk-client.js";
import type { APMInstanceSummary, AppConfig, NormalizedSpan, QuerySource, SearchRequest } from "./types.js";

export interface SearchResult {
  request: SearchRequest;
  totalCount: number;
  spans: NormalizedSpan[];
  requestId?: string;
}

export interface InstancesResult {
  items: APMInstanceSummary[];
  requestId?: string;
}

export class APMClient {
  private readonly traceGateway: TraceGateway;
  private readonly instancesGateway: ReturnType<typeof createInstancesGateway>;

  constructor(private readonly config: AppConfig, client?: SdkClientLike) {
    const sdkClient = client ?? createSdkClient(config);
    this.traceGateway = createTraceGateway(sdkClient);
    this.instancesGateway = createInstancesGateway(sdkClient);
  }

  async search(source: QuerySource, request: SearchRequest): Promise<SearchResult> {
    return this.traceGateway.search(source, request);
  }

  async raw(source: QuerySource, request: SearchRequest): Promise<unknown> {
    return this.traceGateway.raw(source, request);
  }

  async listInstances(): Promise<InstancesResult> {
    return this.instancesGateway.listInstances();
  }

  getConfig(): AppConfig {
    return this.config;
  }
}
