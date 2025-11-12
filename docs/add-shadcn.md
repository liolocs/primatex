# `px add shadcn`

Set up shadcn/ui for your Primate project with React or Svelte.

## Usage

```bash
px add shadcn
```

## What It Does

### Prerequisites

-   **Ensures Tailwind is installed**: Automatically runs `px add tailwind` if needed
-   **Detects your framework**: Reads `config/app.ts` to find React or Svelte
-   **Asks which framework to use** if both are detected

### For React

1. **Installs packages**:

    - `class-variance-authority`
    - `clsx`
    - `tailwind-merge`
    - `lucide-react`
    - `tw-animate-css`

2. **Updates `static/master.css`**:

    - Adds complete shadcn/ui theme
    - Includes dark mode support via CSS variables
    - Sets up HSL color scheme

3. **Creates `components/lib/utils.js`**:

    - Exports `cn()` helper function for class merging

4. **Creates `components.json`**:
    - Configured for React with Primate's structure
    - Sets up aliases: `@/components` → `./components`
    - Specifies TSX format and component paths

### For Svelte

1. **Installs packages**:

    - `tailwind-variants`
    - `clsx`
    - `tailwind-merge`
    - `tw-animate-css`
    - `@lucide/svelte`

2. **Updates `static/master.css`**:

    - Adds complete shadcn-svelte theme
    - Includes dark mode support
    - Sets up HSL color scheme

3. **Creates `components/lib/utils.js`**:

    - Exports `cn()` helper function for class merging

4. **Creates `components.json`**:
    - Configured for Svelte with Primate's structure
    - Sets up aliases: `$lib/*` → `./components/lib/*`
    - Specifies Svelte format and component paths

## After Setup

Once `px add shadcn` completes, use [`px scn`](./scn.md) to add individual components:

```bash
px scn add button
px scn add card dialog
```

## Framework Detection

The command detects frameworks from your `config/app.ts`:

-   **React**: Looks for `@primate/react` import
-   **Svelte**: Looks for `@primate/svelte` import
-   **Both**: Prompts you to choose

## Requirements

-   Tailwind CSS (installed automatically if missing)
-   React or Svelte configured in your Primate project
-   Write access to create/modify files

## Notes

-   The command is safe to run multiple times
-   CSS variables are scoped with HSL values for easy customization
-   Dark mode works automatically via the `.dark` class on `<html>`
