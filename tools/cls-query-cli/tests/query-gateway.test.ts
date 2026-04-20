import { describe, expect, it } from "vitest";
import { createQueryGateway, type QueryGatewayClient } from "../src/gateways/query-gateway.js";

describe("createQueryGateway", () => {
  it("会把 SearchLog 请求原样转发给 SDK", async () => {
    let called = 0;
    let received: unknown;

    const client: QueryGatewayClient = {
      async SearchLog(request) {
        called += 1;
        received = request;
        return {
          Results: [
            {
              PkgId: "pkg-1"
            }
          ],
          ListOver: true,
          Analysis: false,
          Context: "ctx-1",
          RequestId: "request-1"
        };
      }
    };

    const gateway = createQueryGateway(client);
    const response = await gateway.searchLog({
      From: 1,
      To: 2,
      QueryString: "*"
    });

    expect(called).toBe(1);
    expect(received).toEqual({
      From: 1,
      To: 2,
      QueryString: "*"
    });
    expect(response).toEqual({
      Results: [
        {
          PkgId: "pkg-1"
        }
      ],
      ListOver: true,
      Analysis: false,
      Context: "ctx-1",
      RequestId: "request-1"
    });
  });
});
