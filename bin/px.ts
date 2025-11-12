#!/usr/bin/env bun
import { Command } from "commander";
import { runCommand } from "./commands/run.ts";
import { addCommand } from "./commands/add.ts";

const program = new Command();

program
  .name("px")
  .description("Primate CLI wrapper with auto-install and utilities")
  .version("1.0.0");

program
  .command("run")
  .description("Run Primate with automatic package installation")
  .allowUnknownOption()
  .action(async () => {
    const args = process.argv.slice(3);
    await runCommand(args);
  });

program
  .command("add <module>")
  .description("Add and configure modules (e.g., tailwind)")
  .action(async (module: string) => {
    await addCommand(module);
  });

program.parse(process.argv);

