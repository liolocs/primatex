# `px run`

Run Primate with automatic package installation. Monitors output for missing package errors and installs them automatically.

## Usage

```bash
px run
px run -- [primate arguments]
```

## Features

- **Auto-detects missing packages** from build errors
- **Kills hanging processes** when errors are found
- **Installs packages** using the correct package manager (bun/pnpm/yarn/npm)
- **Automatically runs** `px add tailwind` + package manager install if `@primate/tailwind` is missing
- **Retries automatically** after installation
- **Shows real-time output** with elegant spinners

## How It Works

1. Finds the nearest `package.json` by walking up from the current directory
2. Detects the package manager from lockfiles
3. Runs `bunx --bun primate` with any provided arguments and streams output in real-time
4. If "Could not resolve" errors are detected:
   - Immediately kills the hanging process
   - Extracts the missing package names
   - Installs them using the detected package manager
   - Retries running Primate
5. Repeats until success or max attempts (5) reached

## Examples

```bash
# Run Primate with default settings
px run

# Run Primate with specific arguments
px run -- --port 8080

# Run Primate in production mode
px run -- --production
```

## Smart Package Manager Detection

The command automatically uses the right package manager based on lockfiles:

- `bun.lockb` or `bun.lock` → `bun add`
- `pnpm-lock.yaml` → `pnpm add`
- `yarn.lock` → `yarn add`
- `package-lock.json` → `npm install`
- Falls back to `npm install` if no lockfile found

