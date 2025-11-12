# `px add test`

Set up testing infrastructure for your Primate project with Vitest and/or Playwright.

## Usage

```bash
px add test
```

## Interactive Setup

When you run the command, you'll be prompted to choose between:

1. **Unit testing with Vitest**
2. **E2E BDD testing with Playwright**

The command automatically detects existing configurations and skips already-configured options.

## Vitest Setup (Unit Testing)

Sets up browser-mode unit testing for your components.

### Installs

-   `vitest` - Test runner
-   `@vitest/browser` - Browser mode support
-   `vitest-browser-svelte` - Svelte component testing
-   `@vitest/browser-playwright` - Playwright integration
-   `@sveltejs/vite-plugin-svelte` - Svelte support for Vite
-   `@vitest/ui` - Web-based test UI

### Configuration Files

**`vitest.config.js`**:

```js
import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
    plugins: [svelte()],
    test: {
        browser: {
            enabled: true,
            name: "playwright",
            provider: "playwright",
            headless: true,
        },
        setupFiles: ["./vitest-setup-client.ts"],
        include: ["components/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    },
});
```

**`vitest-setup-client.ts`**:

```ts
/// <reference types="@vitest/browser/matchers" />
```

### Package.json Scripts

Adds three test scripts:

```json
{
    "scripts": {
        "test": "vitest run",
        "test:ui": "vitest --ui",
        "test:watch": "vitest"
    }
}
```

### Test File Location

Place test files in: `components/**/*.{test,spec}.{js,ts,jsx,tsx}`

### Example Test

```js
// components/Button.test.js
import { expect, test } from "vitest";
import { render, screen } from "@vitest/browser";
import Button from "./Button.svelte";

test("renders button with text", async () => {
    render(Button, { props: { text: "Click me" } });
    await expect.element(screen.getByText("Click me")).toBeVisible();
});
```

## Playwright Setup (E2E BDD Testing)

Sets up end-to-end testing with Behavior-Driven Development using Gherkin syntax.

### Installs

-   `@playwright/test` - Playwright test runner
-   `playwright` - Browser automation
-   `playwright-bdd` - BDD/Gherkin support

### Directory Structure

```
test/
  e2e/
    features/
      demo.feature         # Gherkin feature files
    steps/
      demo.step.ts         # Step definitions
```

### Configuration File

**`playwright.config.ts`**:

```ts
import { defineConfig } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
    paths: ["test/e2e/features/*.feature"],
    require: ["test/e2e/steps/*.step.ts"],
});

export default defineConfig({
    testDir,
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: "html",
    use: {
        baseURL: "http://localhost:6161",
        trace: "on-first-retry",
    },
    projects: [
        { name: "chromium", use: { ...devices.Chromium } },
        { name: "firefox", use: { ...devices.Firefox } },
        { name: "webkit", use: { ...devices.WebKit } },
    ],
    webServer: {
        command: "bun run dev",
        url: "http://localhost:6161",
        reuseExistingServer: !process.env.CI,
    },
});
```

### Demo Files

**`test/e2e/features/demo.feature`**:

```gherkin
Feature: Demo Feature

  Scenario: User visits homepage
    Given I am on the homepage
    Then I should see "Welcome to Primate"
```

**`test/e2e/steps/demo.step.ts`**:

```ts
import { expect } from "@playwright/test";
import { Given, Then } from "playwright-bdd/decorators";

export class DemoSteps {
    @Given("I am on the homepage")
    async visitHomepage() {
        await this.page.goto("/");
    }

    @Then("I should see {string}")
    async shouldSeeText(text: string) {
        await expect(this.page.locator("body")).toContainText(text);
    }
}
```

### Important Notes

⚠️ **Remember to modify `demo.feature`** to match your app's actual content. The default expects "Welcome to Primate" text on your homepage.

### Running Playwright Tests

```bash
bun run e2e
```

## Choosing Between Vitest and Playwright

### Use Vitest When:

-   Testing individual components in isolation
-   Writing unit tests for functions and utilities
-   Testing component rendering and interactions
-   Fast feedback loop during development

### Use Playwright When:

-   Testing complete user workflows
-   Testing across multiple pages
-   Testing browser-specific behavior
-   Writing acceptance tests with stakeholders (BDD)

### Use Both:

Most projects benefit from both:

-   Vitest for fast unit tests during development
-   Playwright for comprehensive E2E tests before deployment

## Requirements

-   Bun as your package manager (or adjust package manager detection)
-   A Primate project with proper directory structure
-   For Playwright: A development server running on port 6161 (or modify config)

## Detecting Existing Configurations

The command checks for:

-   `vitest.config.js` - Skips Vitest if exists
-   `playwright.config.ts` - Skips Playwright if exists

This prevents accidentally overwriting your custom configurations.
