import { existsSync } from "fs";
import { join, dirname } from "path";

// Find the nearest package.json directory by walking up from CWD
export function findProjectRoot(startDir: string): string {
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
export function detectManager(projectRoot: string): "bun" | "pnpm" | "yarn" | "npm" {
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

