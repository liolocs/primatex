#!/usr/bin/env bun
import { spawn } from "bun";
import { existsSync } from "fs";
import { join, dirname } from "path";
import ora from "ora";

// Find the nearest package.json directory by walking up from CWD
function findProjectRoot(startDir: string): string {
  let currentDir = startDir;
  
  while (currentDir !== "/") {
    if (existsSync(join(currentDir, "package.json"))) {
      return currentDir;
    }
    const parent = dirname(currentDir);
    if (parent === currentDir) break; // Reached root
    currentDir = parent;
  }
  
  // If no package.json found, use the starting directory
  return startDir;
}

// Detect package manager from lockfiles
function detectManager(projectRoot: string): "bun" | "pnpm" | "yarn" | "npm" {
  if (
    existsSync(join(projectRoot, "bun.lockb")) ||
    existsSync(join(projectRoot, "bun.lock"))
  ) {
    return "bun";
  }
  if (existsSync(join(projectRoot, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (existsSync(join(projectRoot, "yarn.lock"))) {
    return "yarn";
  }
  if (
    existsSync(join(projectRoot, "package-lock.json")) ||
    existsSync(join(projectRoot, "npm-shrinkwrap.json"))
  ) {
    return "npm";
  }
  // Default fallback
  return "npm";
}

// Extract missing packages from output
function findMissingPackages(stdout: string, stderr: string): Set<string> {
  const missingPkgs = new Set<string>();
  const rx = /Could not resolve\s+["']([^"']+)["']/g;
  
  for (const chunk of [stdout, stderr]) {
    let match;
    while ((match = rx.exec(chunk)) !== null) {
      missingPkgs.add(match[1]);
    }
  }
  
  return missingPkgs;
}

// Run bunx --bun primate with arguments
async function runPrimate(
  projectRoot: string,
  args: string[]
): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = spawn({
    cmd: ["bunx", "--bun", "primate", ...args],
    cwd: projectRoot,
    stdout: "pipe",
    stderr: "pipe",
    stdin: "inherit",
  });

  let stdout = "";
  let stderr = "";

  // Stream stdout in real-time
  const stdoutReader = proc.stdout.getReader();
  const stderrReader = proc.stderr.getReader();
  
  const decoder = new TextDecoder();

  // Read stdout and stderr concurrently
  const readStreams = Promise.all([
    (async () => {
      while (true) {
        const { done, value } = await stdoutReader.read();
        if (done) break;
        const text = decoder.decode(value);
        stdout += text;
        process.stdout.write(text);
      }
    })(),
    (async () => {
      while (true) {
        const { done, value } = await stderrReader.read();
        if (done) break;
        const text = decoder.decode(value);
        stderr += text;
        process.stderr.write(text);
      }
    })(),
  ]);

  await readStreams;
  await proc.exited;
  
  return {
    code: proc.exitCode ?? 0,
    stdout,
    stderr,
  };
}

// Install missing packages
async function installPackages(
  projectRoot: string,
  packages: string[],
  manager: "bun" | "pnpm" | "yarn" | "npm"
): Promise<void> {
  const commands: Record<typeof manager, [string, string[]]> = {
    bun: ["bun", ["add", ...packages]],
    pnpm: ["pnpm", ["add", ...packages]],
    yarn: ["yarn", ["add", ...packages]],
    npm: ["npm", ["install", ...packages]],
  };

  const [cmd, cmdArgs] = commands[manager];
  
  const spinner = ora({
    text: `Installing ${packages.join(", ")} with ${manager}...`,
    spinner: "dots",
  }).start();
  
  const proc = spawn({
    cmd: [cmd, ...cmdArgs],
    cwd: projectRoot,
    stdout: "pipe",
    stderr: "pipe",
    stdin: "inherit",
  });

  let stdout = "";
  let stderr = "";
  
  const stdoutReader = proc.stdout.getReader();
  const stderrReader = proc.stderr.getReader();
  const decoder = new TextDecoder();

  // Read streams concurrently
  await Promise.all([
    (async () => {
      while (true) {
        const { done, value } = await stdoutReader.read();
        if (done) break;
        const text = decoder.decode(value);
        stdout += text;
      }
    })(),
    (async () => {
      while (true) {
        const { done, value } = await stderrReader.read();
        if (done) break;
        const text = decoder.decode(value);
        stderr += text;
      }
    })(),
  ]);

  await proc.exited;
  
  if (proc.exitCode !== 0) {
    spinner.fail(`Failed to install packages with ${manager}`);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    process.exit(1);
  }
  
  spinner.succeed(`Installed ${packages.join(", ")} with ${manager}`);
}

// Main execution
async function main() {
  const cwd = process.cwd();
  
  const setupSpinner = ora("Initializing...").start();
  
  const projectRoot = findProjectRoot(cwd);
  const manager = detectManager(projectRoot);
  
  setupSpinner.succeed(`Project root: ${projectRoot}`);
  console.log(`📋 Package manager: ${manager}\n`);
  
  // Get CLI args (everything passed to p-run)
  const args = process.argv.slice(2);
  
  const MAX_ATTEMPTS = 5;
  
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      console.log(`\n🔄 Retry attempt ${attempt}/${MAX_ATTEMPTS}\n`);
    }
    
    const runSpinner = ora("Running primate...").start();
    runSpinner.stop(); // Stop to show real-time output
    
    const { code, stdout, stderr } = await runPrimate(projectRoot, args);
    const missingPkgs = findMissingPackages(stdout, stderr);
    
    if (missingPkgs.size === 0) {
      // No missing packages, we're done
      if (code === 0) {
        console.log("\n✅ Primate completed successfully");
      }
      process.exit(code);
    }
    
    // Found missing packages
    const pkgList = Array.from(missingPkgs);
    console.log(`\n⚠️  Missing ${missingPkgs.size} package(s): ${pkgList.join(", ")}`);
    
    if (attempt === MAX_ATTEMPTS) {
      console.error(`\n❌ Max attempts (${MAX_ATTEMPTS}) reached. Exiting.`);
      process.exit(1);
    }
    
    // Install and retry
    await installPackages(projectRoot, pkgList, manager);
    console.log(""); // Add spacing
  }
  
  // Should not reach here, but just in case
  process.exit(1);
}

main().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});

