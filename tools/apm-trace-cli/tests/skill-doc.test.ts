import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

let skillDoc = "";

function extractSection(markdown: string, startHeading: string, endHeading: string): string {
  const startIndex = markdown.indexOf(startHeading);
  const endIndex = markdown.indexOf(endHeading);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error(`无法从 SKILL.md 提取区段：${startHeading} -> ${endHeading}`);
  }

  return markdown.slice(startIndex, endIndex);
}

beforeAll(async () => {
  const testDir = dirname(fileURLToPath(import.meta.url));
  const skillPath = join(testDir, "..", "..", "..", "SKILL.md");
  skillDoc = await readFile(skillPath, "utf8");
});

describe("SKILL.md 的 APM 过滤器说明", () => {
  it("应明确 --filter 会透传到腾讯云 APM Filters", () => {
    const section = extractSection(skillDoc, "### 查询调用链列表", "### 获取单条调用链");

    expect(section).toContain("透传到腾讯云 APM 云 API 的 `Filters` 数组");
  });

  it("应明确 key 必须使用腾讯云 API 认可的过滤维度名", () => {
    const section = extractSection(skillDoc, "### 查询调用链列表", "### 获取单条调用链");

    expect(section).toContain("`key` 必须直接填写腾讯云 APM API 认可的过滤维度名");
    expect(section).toContain("`service.name`");
    expect(section).toContain("`operationName`");
    expect(section).toContain("`traceID`");
  });

  it("应明确 type 的推荐取值和 in 的多值写法", () => {
    const section = extractSection(skillDoc, "### 查询调用链列表", "### 获取单条调用链");

    expect(section).toContain("`type` 按腾讯云官方文档使用 `=`、`!=`、`in`");
    expect(section).toContain("`in` 需要把多个值放进同一个过滤器的 `value`，并用英文逗号连接");
  });
});
