export interface AppConfig {
  secretId: string;
  secretKey: string;
  region?: string;
}

export interface ResolveTimeRangeInput {
  last?: string;
  from?: number;
  to?: number;
  now?: Date;
}

export interface ResolvedTimeRange {
  startTime: number;
  endTime: number;
}

export type OutputTarget = "json" | "csv" | string;

export interface StdoutOutputResult {
  kind: "stdout";
  format: "json" | "csv";
  content: string;
}

export interface FileOutputResult {
  kind: "file";
  format: "json";
  path: string;
  content: string;
}

export type RenderOutputResult = StdoutOutputResult | FileOutputResult;

export interface CommandErrorShape {
  ok: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export interface CommandSuccessShape<TData> {
  ok: true;
  command: string;
  request: unknown;
  data: TData;
  requestId?: string;
}

export type ClsCommandName = "topics" | "query" | "context";
