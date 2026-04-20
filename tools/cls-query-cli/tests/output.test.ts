import { describe, expect, it } from "vitest";
import { CliError } from "../src/config.js";
import { renderOutput } from "../src/domain/output.js";

describe("renderOutput", () => {
  it.each([
    [undefined, "json"],
    ["json", "json"]
  ])("默认和显式 json 输出都走 stdout JSON", (output, expectedFormat) => {
    const result = renderOutput({ ok: true, data: { TopicId: "topic-1" } }, output);

    expect(result).toEqual({
      kind: "stdout",
      format: expectedFormat,
      content: `${JSON.stringify({ ok: true, data: { TopicId: "topic-1" } }, null, 2)}\n`
    });
  });

  it.each([
    [
      [{ TopicId: "topic-1", TopicName: "app-log" }],
      "\"TopicId\",\"TopicName\"\n\"topic-1\",\"app-log\"\n"
    ],
    [
      { TopicId: "topic-2", TopicName: "audit-log" },
      "\"TopicId\",\"TopicName\"\n\"topic-2\",\"audit-log\"\n"
    ]
  ])("输出 csv 时渲染对象数据", (data, expectedContent) => {
    expect(renderOutput(data, "csv")).toEqual({
      kind: "stdout",
      format: "csv",
      content: expectedContent
    });
  });

  it("CSV 表头也会转义特殊字符", () => {
    expect(
      renderOutput(
        [
          {
            'key,with"quotes\nnext': "value"
          }
        ],
        "csv"
      )
    ).toEqual({
      kind: "stdout",
      format: "csv",
      content: `"key,with""quotes\nnext"\n"value"\n`
    });
  });

  it("空数组输出 CSV 时返回稳定的空字符串", () => {
    expect(renderOutput([], "csv")).toEqual({
      kind: "stdout",
      format: "csv",
      content: ""
    });
  });

  it("稀疏数组不会被误判为合法 CSV 数据", () => {
    let caught: unknown;

    try {
      renderOutput(new Array(1), "csv");
    } catch (error: unknown) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(CliError);
    expect(caught).toMatchObject({
      code: "OUTPUT_CSV_UNSUPPORTED_DATA",
      message: "CSV 输出仅支持对象或对象数组"
    });
    expect(caught).not.toBeInstanceOf(TypeError);
  });

  it("输出文件路径时返回 file 结果并保留 JSON 内容", () => {
    expect(renderOutput({ ok: true }, "/tmp/cls-output.json")).toEqual({
      kind: "file",
      format: "json",
      path: "/tmp/cls-output.json",
      content: `${JSON.stringify({ ok: true }, null, 2)}\n`
    });
  });
});
