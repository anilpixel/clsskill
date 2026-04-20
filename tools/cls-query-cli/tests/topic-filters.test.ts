import { describe, expect, it } from "vitest";
import { buildTopicsRequest } from "../src/domain/topic-filters.js";

describe("buildTopicsRequest", () => {
  it("会把 topics 命令参数映射为 DescribeTopicsRequest", () => {
    expect(
      buildTopicsRequest({
        region: "ap-guangzhou",
        topicName: "app-log",
        logsetName: "prod-logset",
        logsetId: "logset-001",
        limit: 50,
        offset: 10
      })
    ).toEqual({
      Filters: [
        {
          Key: "topicName",
          Values: ["app-log"]
        },
        {
          Key: "logsetName",
          Values: ["prod-logset"]
        },
        {
          Key: "logsetId",
          Values: ["logset-001"]
        }
      ],
      Limit: 50,
      Offset: 10
    });
  });

  it("不会把 region 混进 DescribeTopicsRequest", () => {
    expect(
      buildTopicsRequest({
        region: "ap-shanghai"
      })
    ).toEqual({});
  });
});
