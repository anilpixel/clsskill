import { Command, CommanderError } from "commander";
import { writeFile } from "node:fs/promises";
import { CliError, loadConfig } from "./config.js";
import { ClsClient } from "./cls-client.js";
import { registerContextCommand } from "./commands/context.js";
import { registerQueryCommand } from "./commands/query.js";
import { registerTopicsCommand } from "./commands/topics.js";
import type {
  CommandErrorShape,
  RenderOutputResult
} from "./types.js";
import type { AppConfig } from "./types.js";

export interface RunCliDependencies {
  writeJson?: (value: unknown) => void;
  writeOutput?: (value: RenderOutputResult) => void | Promise<void>;
  createClient?: (config?: Partial<AppConfig>) => ClsClient;
  now?: Date;
}

const COMMANDER_HELP_DISPLAYED = "commander.helpDisplayed";

function defaultWriteJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function normalizeCommanderMessage(message: string): string {
  return message.replace(/^error:\s*/u, "");
}

function toErrorShape(error: unknown): CommandErrorShape {
  if (error instanceof CommanderError) {
    return {
      ok: false,
      error: {
        code: "CLI_USAGE_ERROR",
        message: normalizeCommanderMessage(error.message)
      }
    };
  }

  if (error instanceof CliError) {
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        requestId: error.requestId
      }
    };
  }

  if (error instanceof Error) {
    return {
      ok: false,
      error: {
        code: "UNEXPECTED_ERROR",
        message: error.message
      }
    };
  }

  return {
    ok: false,
    error: {
      code: "UNEXPECTED_ERROR",
      message: "未知错误"
    }
  };
}

async function defaultWriteOutput(result: RenderOutputResult): Promise<void> {
  if (result.kind === "stdout") {
    process.stdout.write(result.content);
    return;
  }

  await writeFile(result.path, result.content, "utf8");
}

function createProgram(deps: Required<RunCliDependencies>): Command {
  const program = new Command();

  program
    .name("cls-query")
    .description("腾讯云 CLS 日志查询工具")
    .exitOverride()
    .configureOutput({
      writeErr: () => {
        // 参数错误统一由 JSON 输出处理，这里禁止 commander 直接打印 stderr。
      }
    });

  registerTopicsCommand(program, {
    createClient: deps.createClient,
    writeJson(value: unknown) {
      deps.writeJson(value);
    }
  });

  registerQueryCommand(program, {
    createClient: deps.createClient,
    now: deps.now,
    writeOutput(value: RenderOutputResult) {
      return deps.writeOutput(value);
    }
  });
  registerContextCommand(program, {
    createClient: deps.createClient,
    writeJson(value: unknown) {
      deps.writeJson(value);
    }
  });

  return program;
}

export async function runCli(argv: string[], deps: RunCliDependencies = {}): Promise<number> {
  const resolvedDeps: Required<RunCliDependencies> = {
    writeJson: deps.writeJson ?? defaultWriteJson,
    writeOutput: deps.writeOutput ?? defaultWriteOutput,
    now: deps.now ?? new Date(),
    createClient:
      deps.createClient ??
      ((config?: Partial<AppConfig>) => {
        const baseConfig = loadConfig();
        return new ClsClient({
          secretId: config?.secretId ?? baseConfig.secretId,
          secretKey: config?.secretKey ?? baseConfig.secretKey,
          region: config?.region ?? baseConfig.region
        });
      })
  };

  try {
    const program = createProgram(resolvedDeps);
    await program.parseAsync(argv);
    return 0;
  } catch (error: unknown) {
    if (error instanceof CommanderError && error.code === COMMANDER_HELP_DISPLAYED) {
      return 0;
    }
    resolvedDeps.writeJson(toErrorShape(error));
    return 1;
  }
}
