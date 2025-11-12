import { spawn } from "bun";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import ora from "ora";
import boxen from "boxen";
import { findProjectRoot, detectManager } from "../utils/project.ts";
import { addCommand } from "./add.ts";

type Framework = "react" | "svelte";

// Detect framework from components.json schema
function detectFramework(projectRoot: string): Framework | null {
    const componentsJsonPath = join(projectRoot, "components.json");
    if (!existsSync(componentsJsonPath)) {
        return null;
    }

    try {
        const componentsJson = JSON.parse(readFileSync(componentsJsonPath, "utf-8"));
        const schema = componentsJson.$schema || "";
        
        if (schema.includes("shadcn-svelte")) {
            return "svelte";
        }
        return "react"; // Default to react
    } catch (error) {
        return null;
    }
}

// Get newly added/modified files in components directory
async function getAddedFiles(projectRoot: string): Promise<string[]> {
    // Get untracked files
    const untrackedProc = spawn({
        cmd: ["git", "ls-files", "--others", "--exclude-standard", "components/"],
        cwd: projectRoot,
        stdout: "pipe",
        stderr: "pipe",
    });

    let untrackedStdout = "";
    const decoder = new TextDecoder();
    let reader = untrackedProc.stdout.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        untrackedStdout += decoder.decode(value);
    }

    await untrackedProc.exited;

    // Get modified/added files (staged or unstaged)
    const modifiedProc = spawn({
        cmd: ["git", "diff", "--name-only", "HEAD", "components/"],
        cwd: projectRoot,
        stdout: "pipe",
        stderr: "pipe",
    });

    let modifiedStdout = "";
    reader = modifiedProc.stdout.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        modifiedStdout += decoder.decode(value);
    }

    await modifiedProc.exited;

    // Combine and deduplicate
    const allFiles = new Set<string>();
    
    untrackedStdout.split("\n").forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith("components/") && trimmed.length > 0) {
            allFiles.add(trimmed);
        }
    });
    
    modifiedStdout.split("\n").forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith("components/") && trimmed.length > 0) {
            allFiles.add(trimmed);
        }
    });

    return Array.from(allFiles);
}

// Resolve the actual file path for a component import
function resolveComponentPath(
    projectRoot: string,
    importPath: string,
    fileExt: string
): string {
    const basePath = join(projectRoot, importPath);
    
    // Check if it's a direct file
    if (existsSync(`${basePath}${fileExt}`)) {
        return `${basePath}${fileExt}`;
    }
    
    // Check if it's a folder with index.tsx/index.ts
    if (existsSync(`${basePath}/index${fileExt}`)) {
        return `${basePath}/index${fileExt}`;
    }
    
    if (existsSync(`${basePath}/index.ts`)) {
        return `${basePath}/index.ts`;
    }
    
    // Fallback to assuming it's a file
    return `${basePath}${fileExt}`;
}

// Calculate relative path from one file to another
function calculateRelativePath(fromFile: string, toFile: string): string {
    const fromParts = fromFile.split("/");
    const toParts = toFile.split("/");
    
    // Remove filename from fromFile
    fromParts.pop();
    
    // Find common base
    let commonLength = 0;
    while (
        commonLength < fromParts.length &&
        commonLength < toParts.length &&
        fromParts[commonLength] === toParts[commonLength]
    ) {
        commonLength++;
    }
    
    // Calculate relative path
    const upLevels = fromParts.length - commonLength;
    const downPath = toParts.slice(commonLength);
    
    if (upLevels === 0) {
        return "./" + downPath.join("/");
    }
    
    return "../".repeat(upLevels) + downPath.join("/");
}

// Fix imports in a file
function fixImports(filePath: string, framework: Framework, projectRoot: string): void {
    if (!existsSync(filePath)) {
        return;
    }

    let content = readFileSync(filePath, "utf-8");
    const fileExt = framework === "react" ? ".tsx" : ".svelte";
    
    // Calculate depth: count directory levels after "components/"
    const pathParts = filePath.split("/");
    const componentsIndex = pathParts.indexOf("components");
    const depth = pathParts.length - componentsIndex - 2; // -2 for "components" and filename
    
    // Calculate relative prefix for utils
    const relativePrefix = depth === 0 ? "./" : "../".repeat(depth);
    
    // Pattern 1: Fix utils imports - components/lib/utils -> relative path
    content = content.replace(
        /from\s+["']components\/lib\/utils["']/g,
        `from "${relativePrefix}lib/utils.js"`
    );

    // Pattern 2 & 3: Fix all component imports - components/[path] -> relative path with proper extension
    content = content.replace(
        /from\s+["']components\/([^"']+)["']/g,
        (match, importPath) => {
            // Skip if it's lib/utils (already handled)
            if (importPath === "lib/utils") {
                return match;
            }
            
            // Resolve the actual file path
            const fullImportPath = join(projectRoot, "components", importPath);
            const resolvedPath = resolveComponentPath(projectRoot, `components/${importPath}`, fileExt);
            
            // Determine the correct extension
            let ext = fileExt;
            if (resolvedPath.endsWith("/index.ts")) {
                ext = "/index.ts";
            } else if (resolvedPath.endsWith(`/index${fileExt}`)) {
                ext = `/index${fileExt}`;
            }
            
            // Calculate relative path from current file
            const relativePath = calculateRelativePath(filePath, `components/${importPath}${ext}`);
            
            return `from "${relativePath}"`;
        }
    );

    writeFileSync(filePath, content);
}

export async function scnCommand(args: string[]) {
    const projectRoot = findProjectRoot(process.cwd());
    const manager = detectManager(projectRoot);
    let framework = detectFramework(projectRoot);

    if (!framework) {
        console.log(
            boxen(
                "📦 shadcn/ui not detected\n\nRunning 'px add shadcn' first...",
                {
                    padding: 1,
                    margin: 1,
                    borderStyle: "round",
                    borderColor: "yellow",
                }
            )
        );

        // Run px add shadcn
        await addCommand("shadcn");

        // Re-detect framework after setup
        framework = detectFramework(projectRoot);
        
        if (!framework) {
            console.error(
                boxen(
                    "❌ Failed to set up shadcn/ui\n\nPlease check the error messages above.",
                    {
                        padding: 1,
                        margin: 1,
                        borderStyle: "round",
                        borderColor: "red",
                    }
                )
            );
            process.exit(1);
        }

        console.log(""); // Add spacing before continuing
    }

    console.log(`🎯 Framework: ${framework}`);
    console.log(`📋 Package manager: ${manager}\n`);

    // Build the appropriate command based on manager and framework
    const shadcnPackage = framework === "svelte" ? "shadcn-svelte" : "shadcn";
    
    let cmd: string[];
    switch (manager) {
        case "bun":
            cmd = framework === "svelte" 
                ? ["bun", "x", `${shadcnPackage}@latest`, ...args]
                : ["bunx", "--bun", `${shadcnPackage}@latest`, ...args];
            break;
        case "pnpm":
            cmd = ["pnpm", "dlx", `${shadcnPackage}@latest`, ...args];
            break;
        case "yarn":
            cmd = ["yarn", "dlx", `${shadcnPackage}@latest`, ...args];
            break;
        case "npm":
            cmd = ["npx", `${shadcnPackage}@latest`, ...args];
            break;
    }

    console.log(
        boxen(`🚀 Running: ${cmd.join(" ")}`, {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "cyan",
        })
    );

    // Execute the shadcn command
    const proc = spawn({
        cmd,
        cwd: projectRoot,
        stdout: "inherit",
        stderr: "inherit",
        stdin: "inherit",
    });

    await proc.exited;

    if (proc.exitCode !== 0) {
        console.error(
            boxen("❌ shadcn command failed", {
                padding: 1,
                margin: 1,
                borderStyle: "round",
                borderColor: "red",
            })
        );
        process.exit(proc.exitCode ?? 1);
    }

    // Post-process: Fix imports in generated files
    console.log("\n🔧 Post-processing generated files...\n");

    const spinner = ora("Fixing import paths...").start();

    try {
        // Get newly added files
        const addedFiles = await getAddedFiles(projectRoot);
        
        if (addedFiles.length === 0) {
            spinner.info("No new files detected");
        } else {
            // Fix imports in each file
            for (const file of addedFiles) {
                const fullPath = join(projectRoot, file);
                fixImports(fullPath, framework, projectRoot);
            }

            spinner.succeed(`Fixed imports in ${addedFiles.length} file(s)`);
            
            // Log the files that were updated
            console.log("\n✅ Updated files:");
            for (const file of addedFiles) {
                console.log(`   - ${file}`);
            }
        }

        // Check if shadcn created a components/utils.ts and delete it
        const wrongUtilsPath = join(projectRoot, "components", "utils.ts");
        if (existsSync(wrongUtilsPath)) {
            unlinkSync(wrongUtilsPath);
            console.log("\n🗑️  Removed redundant components/utils.ts");
        }

        console.log(
            boxen(
                `✅ Components added successfully!\n\n🎨 Imports have been fixed for Primate's structure\n📁 Utils located at: components/lib/utils.js`,
                {
                    padding: 1,
                    margin: 1,
                    borderStyle: "round",
                    borderColor: "green",
                }
            )
        );
    } catch (error) {
        spinner.fail("Failed to fix imports");
        console.error(error);
        process.exit(1);
    }
}

