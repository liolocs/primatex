# `px scn`

Add shadcn/ui components with automatic import path fixing for Primate's project structure.

## Usage

```bash
px scn add <component> [components...]
```

## Arguments

- `component`: Name of the shadcn component to add (e.g., `button`, `card`, `dialog`)
- You can specify multiple components in a single command

## What It Does

1. **Detects framework**: Reads `components.json` to determine React or Svelte
2. **Proxies to shadcn CLI**: 
   - Uses `shadcn` for React projects
   - Uses `shadcn-svelte` for Svelte projects
3. **Uses correct package manager**: Automatically detects and uses bunx/pnpm dlx/yarn dlx/npx
4. **Fixes imports automatically**: Post-processes generated files to work with Primate's structure
5. **Cleans up**: Removes redundant files created by shadcn CLI

## Automatic Import Fixing

The command automatically transforms imports in generated component files:

### React Projects

```tsx
// Before (shadcn default)
import { cn } from "components/lib/utils"
import { Button } from "components/ui/button"

// After (Primate-compatible)
import { cn } from "../lib/utils.js"
import { Button } from "./ui/button.tsx"
```

### Svelte Projects

```svelte
<!-- Before (shadcn-svelte default) -->
<script>
  import { cn } from "components/lib/utils"
  import Button from "components/ui/button"
</script>

<!-- After (Primate-compatible) -->
<script>
  import { cn } from "../lib/utils.js"
  import Button from "./ui/button.svelte"
</script>
```

### Import Transformations

- `components/lib/utils` → `../lib/utils.js` (relative path)
- `components/ui/<name>` → `./ui/<name>.tsx` (React) or `./ui/<name>.svelte` (Svelte)
- Adds proper file extensions automatically

## File Processing

The command uses `git diff` to identify newly generated files and only processes those files, ensuring:

- Existing files aren't modified
- Only shadcn-generated files are fixed
- Changes are tracked in git

## Examples

```bash
# Add a single component
px scn add button

# Add multiple components at once
px scn add card alert dialog

# Add a complete block/template
px scn add dashboard-01

# Add form components
px scn add input label textarea select
```

## Prerequisites

- Run `px add shadcn` first to set up shadcn/ui
- `components.json` must exist in your project root
- Git repository (uses `git diff` to detect new files)

## Common Components

- **Buttons**: `button`
- **Forms**: `input`, `label`, `textarea`, `select`, `checkbox`, `radio-group`
- **Layout**: `card`, `dialog`, `sheet`, `tabs`, `accordion`
- **Navigation**: `dropdown-menu`, `navigation-menu`, `breadcrumb`
- **Feedback**: `alert`, `toast`, `progress`, `skeleton`
- **Data**: `table`, `data-table`, `pagination`

See the [shadcn/ui documentation](https://ui.shadcn.com/docs/components) for the full list of available components.

## Troubleshooting

### "components.json not found"

Run `px add shadcn` first to set up shadcn/ui in your project.

### Import errors after adding components

The automatic import fixing should handle this, but if you see import errors:

1. Check that file extensions are present (`.tsx` for React, `.svelte` for Svelte)
2. Verify paths are relative (`../lib/utils.js` not absolute)
3. Ensure `components/lib/utils.js` exists

### Git working tree not clean

The command uses `git diff` to detect new files. Either:

- Commit your pending changes first
- Or the command will still work but may process more files than intended

