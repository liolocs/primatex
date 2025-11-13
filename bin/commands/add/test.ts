import { checkbox } from "@inquirer/prompts";
import boxen from "boxen";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import ora from "ora";
import { join } from "path";
import { installPackages } from "../../utils/packages.ts";
import { detectManager, findProjectRoot } from "../../utils/project.ts";
import { fixturesContent } from "./templates/test/fixtures.ts";
import { homeFeatureContent } from "./templates/test/home-feature.ts";
import { homePageContent } from "./templates/test/HomePage.ts";
import { playwrightConfigContent } from "./templates/test/playwright-config.ts";
import { vitestConfigContent } from "./templates/test/vitest-config.ts";
import { vitestSetupClientContent } from "./templates/test/vitest-setup-client.ts";

type TestOption = "vitest" | "playwright";

// Check if Vitest is already configured
function isVitestConfigured(projectRoot: string): boolean {
    const configPath = join(projectRoot, "vitest.config.js");
    if (!existsSync(configPath)) {
        return false;
    }

    const packageJsonPath = join(projectRoot, "package.json");
    if (!existsSync(packageJsonPath)) {
        return false;
    }

    try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
        return !!(
            packageJson.devDependencies && packageJson.devDependencies.vitest
        );
    } catch {
        return false;
    }
}

// Check if Playwright is already configured
function isPlaywrightConfigured(projectRoot: string): boolean {
    const configPath = join(projectRoot, "playwright.config.ts");
    if (!existsSync(configPath)) {
        return false;
    }

    const packageJsonPath = join(projectRoot, "package.json");
    if (!existsSync(packageJsonPath)) {
        return false;
    }

    try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
        return !!(
            packageJson.devDependencies &&
            packageJson.devDependencies["@playwright/test"]
        );
    } catch {
        return false;
    }
}

// Ask user which testing setup they want
async function askTestChoice(): Promise<TestOption[]> {
    const answer = await checkbox({
        message:
            "Select testing setup (use space to select, enter to confirm):",
        choices: [
            {
                name: "Unit testing with Vitest",
                value: "vitest",
                description:
                    "Browser-based unit testing with Vitest + Playwright",
            },
            {
                name: "E2E BDD testing with Playwright",
                value: "playwright",
                description:
                    "End-to-end BDD testing with Playwright + Cucumber",
            },
        ],
    });

    return answer as TestOption[];
}

// Setup Vitest
async function setupVitest(
    projectRoot: string,
    manager: string
): Promise<void> {
    console.log(
        boxen("🧪 Setting up Vitest", {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "cyan",
        })
    );

    // Install packages
    const spinner = ora("Installing Vitest and dependencies...").start();

    try {
        await installPackages(
            projectRoot,
            [
                "vitest",
                "@vitest/browser",
                "vitest-browser-svelte",
                "@vitest/browser-playwright",
                "@sveltejs/vite-plugin-svelte",
                "@vitest/ui",
            ],
            manager as any
        );
        spinner.succeed("Installed Vitest dependencies");
    } catch (error) {
        spinner.fail("Failed to install dependencies");
        throw error;
    }

    // Create vitest.config.js
    const vitestConfigPath = join(projectRoot, "vitest.config.js");
    writeFileSync(vitestConfigPath, vitestConfigContent);
    console.log("✅ Created vitest.config.js");

    // Create vitest-setup-client.ts
    const setupClientPath = join(projectRoot, "vitest-setup-client.ts");
    writeFileSync(setupClientPath, vitestSetupClientContent);
    console.log("✅ Created vitest-setup-client.ts");

    // Update package.json scripts
    const packageJsonPath = join(projectRoot, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

    if (!packageJson.scripts) {
        packageJson.scripts = {};
    }

    packageJson.scripts.test = "vitest run";
    packageJson.scripts["test:ui"] = "vitest --ui";
    packageJson.scripts["test:watch"] = "vitest";

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log("✅ Updated package.json scripts");

    // Get the appropriate run command for the package manager
    const runCommands: Record<string, string> = {
        bun: "bun run test",
        pnpm: "pnpm test",
        yarn: "yarn test",
        npm: "npm test",
    };
    const runCommand = runCommands[manager] || "npm test";

    console.log(
        boxen(
            `✅ Vitest setup complete!\n\n🚀 Run '${runCommand}' to run tests\n📚 Vitest docs: https://vitest.dev`,
            {
                padding: 1,
                margin: 1,
                borderStyle: "round",
                borderColor: "green",
            }
        )
    );
}

// Setup Playwright
async function setupPlaywright(
    projectRoot: string,
    manager: string
): Promise<void> {
    console.log(
        boxen("🎭 Setting up Playwright with BDD", {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "magenta",
        })
    );

    // Install packages
    const spinner = ora("Installing Playwright and dependencies...").start();

    try {
        await installPackages(
            projectRoot,
            ["@playwright/test", "playwright", "playwright-bdd"],
            manager as any
        );
        spinner.succeed("Installed Playwright dependencies");
    } catch (error) {
        spinner.fail("Failed to install dependencies");
        throw error;
    }

    // Create directory structure
    const testDir = join(projectRoot, "test");
    const e2eDir = join(testDir, "e2e");
    const featuresDir = join(e2eDir, "features");
    const stepsDir = join(featuresDir, "steps");

    [testDir, e2eDir, featuresDir, stepsDir].forEach((dir) => {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    });
    console.log("✅ Created test directory structure");

    // Create home.feature
    const homeFeaturePath = join(featuresDir, "home.feature");
    writeFileSync(homeFeaturePath, homeFeatureContent);
    console.log("✅ Created test/e2e/features/home.feature");

    // Create fixtures.ts
    const fixturesPath = join(stepsDir, "fixtures.ts");
    writeFileSync(fixturesPath, fixturesContent);
    console.log("✅ Created test/e2e/features/steps/fixtures.ts");

    // Create HomePage.ts
    const homePagePath = join(stepsDir, "HomePage.ts");
    writeFileSync(homePagePath, homePageContent);
    console.log("✅ Created test/e2e/features/steps/HomePage.ts");

    // Create playwright.config.ts
    const playwrightConfigPath = join(projectRoot, "playwright.config.ts");
    writeFileSync(playwrightConfigPath, playwrightConfigContent);
    console.log("✅ Created playwright.config.ts");

    // Update package.json scripts
    const packageJsonPath = join(projectRoot, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

    if (!packageJson.scripts) {
        packageJson.scripts = {};
    }

    // Set the e2e script based on package manager
    const bddgenCommands: Record<string, string> = {
        bun: "bunx bddgen",
        pnpm: "pnpm dlx bddgen",
        yarn: "yarn dlx bddgen",
        npm: "npx bddgen",
    };
    const bddgenCommand = bddgenCommands[manager] || "npx bddgen";
    packageJson.scripts.e2e = `${bddgenCommand} && playwright test`;

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log("✅ Updated package.json scripts");

    // Get the appropriate run command for the package manager
    const runCommands: Record<string, string> = {
        bun: "bun e2e",
        pnpm: "pnpm e2e",
        yarn: "yarn e2e",
        npm: "npm run e2e",
    };
    const runCommand = runCommands[manager] || "npm run e2e";

    console.log(
        boxen(
            `✅ Playwright BDD setup complete!\n\n⚠️  Remember to modify test/e2e/features/demo.feature\n   to match your actual application content\n\n🚀 Run '${runCommand}' to run tests\n📚 Playwright docs: https://playwright.dev`,
            {
                padding: 1,
                margin: 1,
                borderStyle: "round",
                borderColor: "green",
            }
        )
    );
}

export async function addTest() {
    const projectRoot = findProjectRoot(process.cwd());
    const manager = detectManager(projectRoot);

    console.log(
        boxen("🧪 Setting up Testing for Primate", {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "yellow",
        })
    );

    console.log(`📂 Project root: ${projectRoot}`);
    console.log(`📋 Package manager: ${manager}\n`);

    // Check what's already configured
    const vitestConfigured = isVitestConfigured(projectRoot);
    const playwrightConfigured = isPlaywrightConfigured(projectRoot);

    if (vitestConfigured && playwrightConfigured) {
        console.log(
            boxen("✅ Both Vitest and Playwright are already configured!", {
                padding: 1,
                margin: 1,
                borderStyle: "round",
                borderColor: "green",
            })
        );
        return;
    }

    if (vitestConfigured) {
        console.log("✅ Vitest already configured");
    }

    if (playwrightConfigured) {
        console.log("✅ Playwright already configured");
    }

    // Ask user what to set up (skip if already configured)
    let choices: TestOption[];

    if (!vitestConfigured && !playwrightConfigured) {
        choices = await askTestChoice();

        if (choices.length === 0) {
            console.log(
                boxen("❌ No testing options selected", {
                    padding: 1,
                    margin: 1,
                    borderStyle: "round",
                    borderColor: "red",
                })
            );
            return;
        }
    } else if (vitestConfigured && !playwrightConfigured) {
        console.log(
            "\n🎭 Setting up Playwright (Vitest already configured)...\n"
        );
        choices = ["playwright"];
    } else if (!vitestConfigured && playwrightConfigured) {
        console.log(
            "\n🧪 Setting up Vitest (Playwright already configured)...\n"
        );
        choices = ["vitest"];
    } else {
        return;
    }

    // Setup based on choices
    for (const choice of choices) {
        if (choice === "vitest" && !vitestConfigured) {
            await setupVitest(projectRoot, manager);
        } else if (choice === "playwright" && !playwrightConfigured) {
            await setupPlaywright(projectRoot, manager);
        }
    }
}
