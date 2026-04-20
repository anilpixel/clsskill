import { describe, expect, it } from "vitest";
import { buildSearchRequest } from "../src/domain/search-request.js";

describe("buildSearchRequest", () => {
  it("组装通用 span 查询请求", () => {
    const request = buildSearchRequest({
      instanceId: "apm-123",
      businessName: "taw",
      range: {
        startTime: 1700000000,
        endTime: 1700000600
      },
      filters: [
        {
          Key: "traceID",
          Type: "=",
          Value: "trace-1"
        }
      ],
      limit: 50,
      offset: 10,
      sortKey: "duration",
      sortOrder: "desc"
    });

    expect(request).toEqual({
      InstanceId: "apm-123",
      BusinessName: "taw",
      StartTime: 1700000000,
      EndTime: 1700000600,
      Filters: [
        {
          Key: "traceID",
          Type: "=",
          Value: "trace-1"
        }
      ],
      Limit: 50,
      Offset: 10,
      OrderBy: {
        Key: "duration",
        Value: "desc"
      }
    });
  });
});
