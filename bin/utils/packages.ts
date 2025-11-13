import { spawn } from "bun";
import ora from "ora";

// Extract missing packages from output
export function findMissingPackages(
    stdout: string,
    stderr: string
): Set<string> {
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
        /Could not resolve\s+["']([^"']+)["']/gi, // Base pattern (case insensitive)
        /\[ERROR\]\s+Could not resolve\s+["']([^"']+)["']/gi, // [ERROR] format
        /ERROR:\s+Could not resolve\s+["']([^"']+)["']/gi, // ERROR: format
        /error:\s+.*Could not resolve\s+["']([^"']+)["']/gi, // error: with prefix
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(combined)) !== null) {
            const pkg = match[1];
            missingPkgs.add(pkg);
            if (process.env.DEBUG_PRUN) {
                console.log(
                    `[DEBUG] Found package: ${pkg} using pattern: ${pattern}`
                );
            }
        }
    }

    if (process.env.DEBUG_PRUN) {
        console.log(`[DEBUG] Total packages found: ${missingPkgs.size}`);
    }

    return missingPkgs;
}

// Install missing packages
export async function installPackages(
    projectRoot: string,
    packages: string[],
    manager: "bun" | "pnpm" | "yarn" | "npm",
    isDev: boolean = false // Add this parameter
): Promise<void> {
    const commands: Record<typeof manager, [string, string[]]> = {
        bun: ["bun", ["add", ...(isDev ? ["-D"] : []), ...packages]],
        pnpm: ["pnpm", ["add", ...(isDev ? ["-D"] : []), ...packages]],
        yarn: ["yarn", ["add", ...(isDev ? ["-D"] : []), ...packages]],
        npm: [
            "npm",
            ["install", ...(isDev ? ["--save-dev"] : []), ...packages],
        ],
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
