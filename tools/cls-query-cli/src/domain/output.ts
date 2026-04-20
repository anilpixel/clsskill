import { CliError } from "../config.js";
import type {
  OutputTarget,
  RenderOutputResult,
  StdoutOutputResult
} from "../types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function formatCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  return JSON.stringify(value);
}

function escapeCsvCell(value: string): string {
  const escaped = value.replace(/"/gu, '""');
  return `"${escaped}"`;
}

function renderCsvCell(value: string): string {
  return escapeCsvCell(value);
}

function collectCsvRows(data: unknown): ReadonlyArray<Record<string, unknown>> {
  if (Array.isArray(data)) {
    for (let index = 0; index < data.length; index += 1) {
      if (!(index in data) || !isRecord(data[index])) {
        throw new CliError("OUTPUT_CSV_UNSUPPORTED_DATA", "CSV 输出仅支持对象或对象数组");
      }
    }

    return data;
  }

  if (isRecord(data)) {
    return [data];
  }

  throw new CliError("OUTPUT_CSV_UNSUPPORTED_DATA", "CSV 输出仅支持对象或对象数组");
}

function renderCsv(data: unknown): StdoutOutputResult {
  const rows = collectCsvRows(data);
  const columns: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }

  if (rows.length === 0) {
    return {
      kind: "stdout",
      format: "csv",
      content: ""
    };
  }

  const lines = [columns.map(renderCsvCell).join(",")];

  for (const row of rows) {
    const values = columns.map((column) => escapeCsvCell(formatCsvCell(row[column])));
    lines.push(values.join(","));
  }

  return {
    kind: "stdout",
    format: "csv",
    content: `${lines.join("\n")}\n`
  };
}

export function renderOutput(data: unknown, output?: OutputTarget): RenderOutputResult {
  if (output === undefined || output === "json") {
    return {
      kind: "stdout",
      format: "json",
      content: serializeJson(data)
    };
  }

  if (output === "csv") {
    return renderCsv(data);
  }

  return {
    kind: "file",
    format: "json",
    path: output,
    content: serializeJson(data)
  };
}
