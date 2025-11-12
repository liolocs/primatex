# primate-wrap

A Bun-based CLI wrapper for Primate with automatic package installation and helpful utilities.

## Installation

The package is installed globally via `bun link`. The `px` command is available system-wide.

## Commands

### `px run`

Run Primate with automatic package installation. Monitors output for missing package errors and installs them automatically.

```bash
px run
px run -- [primate arguments]
```

**Features:**

-   Auto-detects missing packages from build errors
-   Kills hanging processes when errors are found
-   Installs packages using the correct package manager (bun/pnpm/yarn/npm)
-   Automatically runs `px add tailwind` + package manager install if `@primate/tailwind` is missing
-   Retries automatically after installation
-   Shows real-time output with elegant spinners

### `px add tailwind`

Set up Tailwind CSS for your Primate project automatically.

```bash
px add tailwind
```

**What it does:**

-   Installs `@primate/tailwind` and `tailwindcss`
-   Creates `tailwind.config.js` with proper content paths (views, components, routes, lib)
-   Creates/updates `static/master.css` with `@import "tailwindcss"`
-   Updates `config/app.ts` to:
    -   Add `import tailwind from "@primate/tailwind"`
    -   Add `tailwind()` to the modules array

### `px add shadcn`

Set up shadcn/ui for your Primate project with React or Svelte.

```bash
px add shadcn
```

**What it does:**

-   Ensures Tailwind is installed (runs `px add tailwind` if needed)
-   Detects your framework (React or Svelte) from `config/app.ts`
-   Asks which framework to use if both are detected
-   **For React:**
    -   Installs: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css`
    -   Updates `master.css` with complete shadcn/ui theme (dark mode support)
    -   Creates `components/lib/utils.js` with `cn()` helper
    -   Creates `components.json` for shadcn CLI
-   **For Svelte:**
    -   Installs: `tailwind-variants`, `clsx`, `tailwind-merge`, `tw-animate-css`, `@lucide/svelte`
    -   Updates `master.css` with complete shadcn-svelte theme (dark mode support)
    -   Creates `components/lib/utils.js` with `cn()` helper
    -   Creates `components.json` for shadcn-svelte CLI

### `px scn`

Add shadcn/ui components with automatic import path fixing for Primate's project structure.

```bash
px scn add button
px scn add card dialog
px scn add dashboard-01
```

**What it does:**

-   Detects framework (React/Svelte) from `components.json`
-   Proxies to the appropriate shadcn CLI (`shadcn` for React, `shadcn-svelte` for Svelte)
-   Uses the correct package manager command (bunx/pnpm dlx/yarn dlx/npx)
-   **Automatically fixes imports** in generated files:
    -   `components/lib/utils` → `../lib/utils.js` (relative path)
    -   `components/ui/button` → `./ui/button.tsx` (React) or `./ui/button.svelte` (Svelte)
    -   Adds proper file extensions (`.tsx` for React, `.svelte` for Svelte)
-   Removes redundant `components/utils.ts` if created by shadcn
-   Uses `git diff` to identify and process only newly generated files

**Examples:**

```bash
# Add a single component
px scn add button

# Add multiple components
px scn add card alert dialog

# Add a complete block/template
px scn add dashboard-01
```

### `px add test`

Set up testing infrastructure for your Primate project with Vitest and/or Playwright.

```bash
px add test
```

**Interactive Setup:**

When you run `px add test`, you'll be prompted to choose:

1. Unit testing with Vitest
2. E2E BDD testing with Playwright
3. Both

The command automatically detects existing configurations and skips already-configured options.

**Vitest Setup (Unit Testing):**

-   **Installs**: `vitest`, `@vitest/browser`, `vitest-browser-svelte`, `@vitest/browser-playwright`, `@sveltejs/vite-plugin-svelte`, `@vitest/ui`
-   **Creates `vitest.config.js`**: Configured for browser mode with Playwright and Svelte support
-   **Creates `vitest-setup-client.ts`**: Type references for Vitest browser matchers
-   **Updates `package.json` scripts**:
    -   `test`: Run tests once
    -   `test:ui`: Run tests with UI
    -   `test:watch`: Run tests in watch mode
-   Test files: `components/**/*.{test,spec}.{js,ts,jsx,tsx}`

**Playwright Setup (E2E BDD Testing):**

-   **Installs**: `@playwright/test`, `playwright`, `playwright-bdd`
-   **Creates directory structure**:
    ```
    test/
      e2e/
        features/
          demo.feature
        steps/
          demo.step.ts
    ```
-   **Creates `playwright.config.ts`**: Full BDD configuration with:
    -   Chromium, Firefox, and WebKit browsers
    -   Web server on `localhost:6161`
    -   HTML reporter
-   **Demo files**: Includes example feature and step definitions
-   **⚠️ Remember** to modify `demo.feature` to match your app's content

## Features

-   **Auto-detects project root**: Walks up from current directory to find `package.json`
-   **Smart package manager detection**: Automatically uses the right package manager based on lockfiles:
    -   `bun.lockb` or `bun.lock` → `bun add`
    -   `pnpm-lock.yaml` → `pnpm add`
    -   `yarn.lock` → `yarn add`
    -   `package-lock.json` → `npm install`
    -   Falls back to `npm install` if no lockfile found
-   **Automatic missing package installation**: Parses output for "Could not resolve" errors and installs packages automatically
-   **Real-time output**: Shows stdout/stderr as it happens for full visibility
-   **Elegant spinners**: Uses ora for beautiful loading indicators
-   **Retry loop**: Attempts up to 5 times to resolve all missing packages
-   **Pass-through arguments**: All CLI args are forwarded to Primate

## How `px run` Works

1. Finds the nearest `package.json` by walking up from the current directory
2. Detects the package manager from lockfiles
3. Runs `bunx --bun primate` with any provided arguments and streams output in real-time
4. If "Could not resolve" errors are detected:
    - Immediately kills the hanging process
    - Extracts the missing package names
    - Installs them using the detected package manager
    - Retries running Primate
5. Repeats until success or max attempts (5) reached

## Development

The source code is located at `~/Development/primate-wrap`.

To make changes:

1. Edit files in `~/Development/primate-wrap`
2. The package is linked globally, so changes take effect immediately

## Project Structure

```
~/Development/primate-wrap/
├── package.json
├── bin/
│   ├── px.ts              # Main CLI entry point
│   ├── commands/
│   │   ├── run.ts         # px run command
│   │   ├── add.ts         # px add dispatcher
│   │   ├── scn.ts         # px scn command
│   │   └── add/
│   │       ├── tailwind.ts    # px add tailwind
│   │       └── shadcn.ts      # px add shadcn
│   └── utils/
│       ├── project.ts     # Project detection utilities
│       ├── packages.ts    # Package management utilities
│       └── primate.ts     # Primate process runner
└── README.md
```

## Requirements

-   Bun installed and available on PATH
-   `~/.bun/bin` in PATH (already configured in your `.zshrc`)

## Updating

After making changes to the code in `~/Development/primate-wrap`, run:

```bash
cd ~/Development/primate-wrap && bun unlink && bun link
```

This updates the global installation with your changes.
