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
- Auto-detects missing packages from build errors
- Kills hanging processes when errors are found
- Installs packages using the correct package manager (bun/pnpm/yarn/npm)
- Automatically runs `px add tailwind` + package manager install if `@primate/tailwind` is missing
- Retries automatically after installation
- Shows real-time output with elegant spinners

### `px add tailwind`

Set up Tailwind CSS for your Primate project automatically.

```bash
px add tailwind
```

**What it does:**
- Installs `@primate/tailwind` and `tailwindcss`
- Creates `tailwind.config.js` with proper content paths (views, components, routes, lib)
- Creates/updates `static/master.css` with Tailwind directives
- Updates `config/app.ts` to include the CSS file

## Features

- **Auto-detects project root**: Walks up from current directory to find `package.json`
- **Smart package manager detection**: Automatically uses the right package manager based on lockfiles:
  - `bun.lockb` or `bun.lock` → `bun add`
  - `pnpm-lock.yaml` → `pnpm add`
  - `yarn.lock` → `yarn add`
  - `package-lock.json` → `npm install`
  - Falls back to `npm install` if no lockfile found
- **Automatic missing package installation**: Parses output for "Could not resolve" errors and installs packages automatically
- **Real-time output**: Shows stdout/stderr as it happens for full visibility
- **Elegant spinners**: Uses ora for beautiful loading indicators
- **Retry loop**: Attempts up to 5 times to resolve all missing packages
- **Pass-through arguments**: All CLI args are forwarded to Primate

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
│   │   └── add.ts         # px add command
│   └── utils/
│       ├── project.ts     # Project detection utilities
│       ├── packages.ts    # Package management utilities
│       └── primate.ts     # Primate process runner
└── README.md
```

## Requirements

- Bun installed and available on PATH
- `~/.bun/bin` in PATH (already configured in your `.zshrc`)

## Updating

After making changes to the code in `~/Development/primate-wrap`, run:

```bash
cd ~/Development/primate-wrap && bun unlink && bun link
```

This updates the global installation with your changes.

