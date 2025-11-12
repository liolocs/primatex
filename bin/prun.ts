#!/usr/bin/env bun
import { spawn } from "bun";
import { existsSync } from "fs";
import { join, dirname } from "path";
import ora from "ora";
import boxen from "boxen";

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
  
  // Combine output for searching
  const combined = stdout + "\n" + stderr;
  
  // Debug: Write output to temp file for inspection
  if (process.env.DEBUG_PRUN) {
    const fs = require("fs");
    fs.writeFileSync("/tmp/prun-debug-stdout.txt", stdout);
    fs.writeFileSync("/tmp/prun-debug-stderr.txt", stderr);
    console.log("\n[DEBUG] Output written to /tmp/prun-debug-*.txt");
  }
  
  // Multiple regex patterns to catch different error formats
  const patterns = [
    /Could not resolve\s+["']([^"']+)["']/gi,  // Base pattern (case insensitive)
    /\[ERROR\]\s+Could not resolve\s+["']([^"']+)["']/gi,  // [ERROR] format
    /ERROR:\s+Could not resolve\s+["']([^"']+)["']/gi,  // ERROR: format  
    /error:\s+.*Could not resolve\s+["']([^"']+)["']/gi,  // error: with prefix
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(combined)) !== null) {
      const pkg = match[1];
      missingPkgs.add(pkg);
      if (process.env.DEBUG_PRUN) {
        console.log(`[DEBUG] Found package: ${pkg} using pattern: ${pattern}`);
      }
    }
  }
  
  if (process.env.DEBUG_PRUN) {
    console.log(`[DEBUG] Total packages found: ${missingPkgs.size}`);
  }
  
  return missingPkgs;
}

// Run bunx --bun primate with arguments
async function runPrimate(
  projectRoot: string,
  args: string[],
  checkForErrors: boolean = true
): Promise<{ code: number; stdout: string; stderr: string; shouldContinue: boolean }> {
  const proc = spawn({
    cmd: ["bunx", "--bun", "primate", ...args],
    cwd: projectRoot,
    stdout: "pipe",
    stderr: "pipe",
    stdin: "inherit",
  });

  let stdout = "";
  let stderr = "";
  let hasErrors = false;
  let processKilled = false;

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
        
        // Check for errors in real-time and kill process if found
        if (checkForErrors && !processKilled && /Could not resolve\s+["']/i.test(text)) {
          hasErrors = true;
          processKilled = true;
          // Kill the process immediately
          proc.kill();
          break;
        }
      }
    })(),
    (async () => {
      while (true) {
        const { done, value } = await stderrReader.read();
        if (done) break;
        const text = decoder.decode(value);
        stderr += text;
        process.stderr.write(text);
        
        // Check for errors in real-time and kill process if found
        if (checkForErrors && !processKilled && /Could not resolve\s+["']/i.test(text)) {
          hasErrors = true;
          processKilled = true;
          // Kill the process immediately
          proc.kill();
          break;
        }
      }
    })(),
  ]);

  await readStreams;
  
  // Wait for process to exit (will be quick if we killed it)
  await proc.exited;
  
  return {
    code: proc.exitCode ?? (processKilled ? 1 : 0),
    stdout,
    stderr,
    shouldContinue: false, // Not used anymore
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
  
  // Get CLI args (everything passed to prun)
  const args = process.argv.slice(2);
  
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

main().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});

