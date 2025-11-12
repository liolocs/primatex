# Primatex

A Bun-based CLI wrapper for Primate with automatic package installation and helpful utilities.

## Installation

```bash
bun link
```

The `px` command is now available system-wide.

## Commands

### `px run [-- arguments]`

Run Primate with automatic missing package detection and installation.

[**📖 Full Documentation**](./docs/run.md)

**Features**: Auto-detects missing packages, kills hanging processes, installs packages using correct package manager, retries automatically.

### `px add tailwind`

Set up Tailwind CSS for your Primate project automatically.

[**📖 Full Documentation**](./docs/add-tailwind.md)

**What it does**: Installs `@primate/tailwind` and `tailwindcss`, creates `tailwind.config.js`, updates `master.css` and `config/app.ts`.

### `px add shadcn`

Set up shadcn/ui for your Primate project with React or Svelte.

[**📖 Full Documentation**](./docs/add-shadcn.md)

**What it does**: Ensures Tailwind is installed, detects framework, installs dependencies, sets up theme with dark mode, creates `components.json`.

### `px scn add <component> [components...]`

Add shadcn/ui components with automatic import path fixing for Primate.

[**📖 Full Documentation**](./docs/scn.md)

**What it does**: Proxies to shadcn CLI, automatically fixes imports for Primate's structure, adds file extensions, removes redundant files.

**Example**: `px scn add button card dialog`

### `px add test`

Set up testing infrastructure with Vitest (unit) and/or Playwright (E2E BDD).

[**📖 Full Documentation**](./docs/add-test.md)

**What it does**: Interactive setup for Vitest browser-mode testing and/or Playwright BDD testing with Gherkin syntax.

## Key Features

-   **Auto-detects project root**: Walks up from current directory to find `package.json`
-   **Smart package manager detection**: Automatically uses the right package manager (bun/pnpm/yarn/npm) based on lockfiles
-   **Automatic missing package installation**: Parses output for errors and installs packages automatically
-   **Real-time output**: Shows stdout/stderr as it happens with elegant spinners
-   **Pass-through arguments**: All CLI args are forwarded to underlying tools

## Development

To make changes:

1. Edit files in this repository
2. Run `bun link` to update the global installation
3. Changes take effect immediately

## Project Structure

```
primatex/
├── bin/
│   ├── px.ts              # Main CLI entry point
│   ├── prun.ts            # px run entry point
│   ├── commands/
│   │   ├── run.ts         # px run command
│   │   ├── add.ts         # px add dispatcher
│   │   ├── scn.ts         # px scn command
│   │   └── add/
│   │       ├── index.ts       # px add router
│   │       ├── tailwind.ts    # px add tailwind
│   │       ├── shadcn.ts      # px add shadcn
│   │       └── test.ts        # px add test
│   └── utils/
│       ├── project.ts     # Project detection utilities
│       ├── packages.ts    # Package management utilities
│       └── primate.ts     # Primate process runner
├── docs/                  # Detailed command documentation
└── package.json
```

## Requirements

-   Bun installed and available on PATH
-   Git (for `px scn` import fixing)
