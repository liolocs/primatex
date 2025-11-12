# `px add tailwind`

Set up Tailwind CSS for your Primate project automatically.

## Usage

```bash
px add tailwind
```

## What It Does

1. **Installs packages**:

    - `@primate/tailwind`
    - `tailwindcss`

2. **Creates `tailwind.config.js`** with proper content paths:

    - `views/**/*.{js,jsx,ts,tsx,svelte}`
    - `components/**/*.{js,jsx,ts,tsx,svelte}`
    - `routes/**/*.{js,jsx,ts,tsx,svelte}`
    - `lib/**/*.{js,jsx,ts,tsx,svelte}`

3. **Creates/updates `static/master.css`** with:

    ```css
    @import "tailwindcss";
    ```

4. **Updates `config/app.ts`** to:
    - Add `import tailwind from "@primate/tailwind"`
    - Add `tailwind()` to the modules array

## Requirements

-   A Primate project with `config/app.ts`
-   Write access to create/modify files in the project

## Notes

-   This command is idempotent - running it multiple times won't break your configuration
-   It's automatically called by `px add shadcn` if Tailwind isn't already installed
-   The command uses your project's detected package manager for installation
