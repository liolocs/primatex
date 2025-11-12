import ora from "ora";
import boxen from "boxen";
import { findProjectRoot, detectManager } from "../utils/project.ts";
import { findMissingPackages, installPackages } from "../utils/packages.ts";
import { runPrimate } from "../utils/primate.ts";
import { addCommand } from "./add.ts";

// Check if output contains @primate/tailwind error
function needsTailwindSetup(stdout: string, stderr: string): boolean {
  const combined = stdout + "\n" + stderr;
  return /Cannot find module\s+['"]@primate\/tailwind['"]/i.test(combined);
}

export async function runCommand(args: string[]) {
  const cwd = process.cwd();
  
  const setupSpinner = ora("Initializing...").start();
  
  const projectRoot = findProjectRoot(cwd);
  const manager = detectManager(projectRoot);
  
  setupSpinner.succeed(`Project root: ${projectRoot}`);
  console.log(`📋 Package manager: ${manager}\n`);
  
  const MAX_ATTEMPTS = 5;
  
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      console.log(`\n🔄 Retry attempt ${attempt}/${MAX_ATTEMPTS}\n`);
    }
    
    // Draw a nice box header
    console.log(
      boxen(`🚀 Running Primate ${attempt > 1 ? `(Attempt ${attempt})` : ""}`, {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "cyan",
      })
    );
    
    const { code, stdout, stderr, shouldContinue } = await runPrimate(
      projectRoot,
      args,
      attempt < MAX_ATTEMPTS // Only check for errors if we have retries left
    );
    
    // Check if @primate/tailwind is missing
    if (needsTailwindSetup(stdout, stderr)) {
      console.log(
        boxen("🎨 Detected missing @primate/tailwind\n\nRunning Tailwind setup...", {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "magenta",
        })
      );
      
      // Run px add tailwind
      await addCommand("tailwind");
      
      // Run package manager install to ensure all dependencies are installed
      const installSpinner = ora(`Running ${manager} install...`).start();
      const { spawn } = await import("bun");
      
      const installCommands: Record<typeof manager, string[]> = {
        bun: ["bun", "install"],
        pnpm: ["pnpm", "install"],
        yarn: ["yarn", "install"],
        npm: ["npm", "install"],
      };
      
      const installProc = spawn({
        cmd: installCommands[manager],
        cwd: projectRoot,
        stdout: "pipe",
        stderr: "pipe",
        stdin: "inherit",
      });
      
      await installProc.exited;
      
      if (installProc.exitCode === 0) {
        installSpinner.succeed(`${manager} install completed`);
      } else {
        installSpinner.fail(`${manager} install failed`);
      }
      
      console.log("\n🔄 Retrying Primate...\n");
      continue; // Retry after setup
    }
    
    const missingPkgs = findMissingPackages(stdout, stderr);
    
    if (missingPkgs.size === 0) {
      // No missing packages - if process is still running (code 0), it succeeded
      // Don't show completion box, just exit with the code
      process.exit(code);
    }
    
    // Draw a box showing we found missing packages
    console.log(
      boxen(`⚠️  Found ${missingPkgs.size} missing package(s)`, {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "yellow",
      })
    );
    
    // Found missing packages
    const pkgList = Array.from(missingPkgs);
    console.log(`📦 Missing packages: ${pkgList.join(", ")}\n`);
    
    if (attempt === MAX_ATTEMPTS) {
      console.error(
        boxen(`❌ Max attempts (${MAX_ATTEMPTS}) reached`, {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "red",
        })
      );
      process.exit(1);
    }
    
    // Install and retry
    await installPackages(projectRoot, pkgList, manager);
    console.log(""); // Add spacing
  }
  
  // Should not reach here, but just in case
  process.exit(1);
}

