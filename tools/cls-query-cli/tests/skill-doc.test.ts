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

describe("SKILL.md 文档契约", () => {
  it("topics 区段不应宣称支持 --output", () => {
    const topicsSection = extractSection(skillDoc, "### 列出日志主题", "### 查询日志");

    expect(topicsSection).not.toContain("--output");
  });

  it("query 区段应明确不传 --max 时只请求一页", () => {
    const querySection = extractSection(skillDoc, "### 查询日志", "### 查询上下文日志");

    expect(querySection).toContain("不传时只请求一页");
    expect(querySection).not.toContain("`0` 表示只请求一页");
  });

  it("context 区段应显式要求 --btime，且不应宣称支持 --output", () => {
    const contextSection = extractSection(skillDoc, "### 查询上下文日志", "## APM 调用链查询");

    expect(contextSection).toContain("--btime <SearchLog.Results[].Time>");
    expect(contextSection).toContain("| `--btime`         | 是");
    expect(contextSection).not.toContain("--output");
  });
});
