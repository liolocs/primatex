# primate-wrap

A Bun-based CLI wrapper for Primate that automatically installs missing packages when they're detected.

## Installation

The package is already installed globally via `bun link`. The `prun` command is available system-wide.

## Usage

Instead of running `bunx --bun primate`, use:

```bash
prun
```

Or with arguments:

```bash
prun -- [primate arguments]
```

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

## How it works

1. Finds the nearest `package.json` by walking up from the current directory
2. Detects the package manager from lockfiles
3. Runs `bunx --bun primate` with any provided arguments
4. If "Could not resolve" errors are detected:
   - Extracts the missing package names
   - Installs them using the detected package manager
   - Retries running Primate
5. Repeats until success or max attempts (5) reached

## Development

The source code is located at `~/Development/primate-wrap`.

To make changes:

1. Edit files in `~/Development/primate-wrap`
2. The package is linked globally, so changes take effect immediately

## Project structure

```
~/Development/primate-wrap/
├── package.json
├── bin/
│   └── prun.ts    # Main CLI script
└── README.md
```

## Requirements

- Bun installed and available on PATH
- `~/.bun/bin` in PATH (already configured in your `.zshrc`)

