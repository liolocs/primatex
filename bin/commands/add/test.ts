import { checkbox } from "@inquirer/prompts";
import boxen from "boxen";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import ora from "ora";
import { join } from "path";
import { installPackages } from "../../utils/packages.ts";
import { detectManager, findProjectRoot } from "../../utils/project.ts";

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
    const vitestConfig = `import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [
        svelte({
            compilerOptions: {
                dev: true,
            },
        }),
    ],
    test: {
        include: [
            "components/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        ],
        browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
        },
        setupFiles: ["./vitest-setup-client.ts"],
    },
});
`;

    writeFileSync(vitestConfigPath, vitestConfig);
    console.log("✅ Created vitest.config.js");

    // Create vitest-setup-client.ts
    const setupClientPath = join(projectRoot, "vitest-setup-client.ts");
    const setupClientContent = `/// <reference types="@vitest/browser/matchers" />
`;

    writeFileSync(setupClientPath, setupClientContent);
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

    console.log(
        boxen(
            "✅ Vitest setup complete!\n\n🚀 Run 'bun run test' to run tests\n📚 Vitest docs: https://vitest.dev",
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
    const stepsDir = join(e2eDir, "steps");

    [testDir, e2eDir, featuresDir, stepsDir].forEach((dir) => {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    });
    console.log("✅ Created test directory structure");

    // Create demo.step.ts
    const demoStepPath = join(stepsDir, "demo.step.ts");
    const demoStepContent = `import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

Given("I am on the home page", async ({ page }) => {
    await page.goto("http://localhost:6161/");
});

Then("I should see {string} text", async ({ page }, content: string) => {
    await expect(page.getByText(content)).toBeVisible();
});
`;

    writeFileSync(demoStepPath, demoStepContent);
    console.log("✅ Created test/e2e/steps/demo.step.ts");

    // Create demo.feature
    const demoFeaturePath = join(featuresDir, "demo.feature");
    const demoFeatureContent = `Feature: Demo functionality

  As a user
  I want to be able to view the demo page
  Scenario: User visits home page
    Given I am on the home page
    Then I should see "counter" text
`;

    writeFileSync(demoFeaturePath, demoFeatureContent);
    console.log("✅ Created test/e2e/features/demo.feature");

    // Create playwright.config.ts
    const playwrightConfigPath = join(projectRoot, "playwright.config.ts");
    const playwrightConfig = `import { defineConfig, devices } from "@playwright/test";

import { defineBddConfig } from "playwright-bdd";
const testDir = defineBddConfig({
    features: "test/e2e/features",
    steps: "test/e2e/steps",
});
/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });
/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir,
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: "html",
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like \`await page.goto('')\`. */
        // baseURL: 'http://localhost:3000',
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: "on-first-retry",
    },
    /* Configure projects for major browsers */
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
        },
        {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
        },
        /* Test against mobile viewports. */
        // {
        //   name: 'Mobile Chrome',
        //   use: { ...devices['Pixel 5'] },
        // },
        // {
        //   name: 'Mobile Safari',
        //   use: { ...devices['iPhone 12'] },
        // },
        /* Test against branded browsers. */
        // {
        //   name: 'Microsoft Edge',
        //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
        // },
        // {
        //   name: 'Google Chrome',
        //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
        // },
    ],
    /* Run your local dev server before starting the tests */
    webServer: {
        command: "bun run build && bun run serve",
        url: "http://localhost:6161",
        reuseExistingServer: !process.env.CI,
    },
});
`;

    writeFileSync(playwrightConfigPath, playwrightConfig);
    console.log("✅ Created playwright.config.ts");

    // Update package.json scripts
    const packageJsonPath = join(projectRoot, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

    if (!packageJson.scripts) {
        packageJson.scripts = {};
    }

    packageJson.scripts.e2e = "bunx bddgen && playwright test";

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log("✅ Updated package.json scripts");

    console.log(
        boxen(
            "✅ Playwright BDD setup complete!\n\n⚠️  Remember to modify test/e2e/features/demo.feature\n   to match your actual application content\n\n🚀 Run 'bun e2e' to run tests\n📚 Playwright docs: https://playwright.dev",
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
