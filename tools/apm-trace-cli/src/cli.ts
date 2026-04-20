#!/usr/bin/env node
import { runCli } from "./cli-runner.js";

const exitCode = await runCli(process.argv);
process.exitCode = exitCode;
