import boxen from "boxen";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import ora from "ora";
import { join } from "path";
import { select } from "@inquirer/prompts";
import { installPackages } from "../../utils/packages.ts";
import { detectManager, findProjectRoot } from "../../utils/project.ts";
import { addTailwind, isTailwindSetup } from "./tailwind.ts";

type Framework = "react" | "svelte";

// Detect which framework is being used
function detectFramework(projectRoot: string): Framework | null {
    const appConfigPath = join(projectRoot, "config", "app.ts");
    if (!existsSync(appConfigPath)) {
        return null;
    }

    const config = readFileSync(appConfigPath, "utf-8");
    const hasReact = config.includes("@primate/react");
    const hasSvelte = config.includes("@primate/svelte");

    if (hasReact && hasSvelte) {
        return "both" as any; // Will be handled by asking user
    }
    if (hasReact) return "react";
    if (hasSvelte) return "svelte";
    return null;
}

// Ask user which framework to use
async function askFramework(): Promise<Framework> {
    const answer = await select({
        message: "Both React and Svelte detected. Which framework do you want to use for shadcn?",
        choices: [
            {
                name: "React",
                value: "react" as const,
                description: "Use shadcn/ui for React",
            },
            {
                name: "Svelte",
                value: "svelte" as const,
                description: "Use shadcn-svelte",
            },
        ],
    });

    return answer;
}

export async function addShadcn() {
    const projectRoot = findProjectRoot(process.cwd());
    const manager = detectManager(projectRoot);

    console.log(
        boxen("✨ Setting up shadcn/ui for Primate", {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "magenta",
        })
    );

    console.log(`📂 Project root: ${projectRoot}`);
    console.log(`📋 Package manager: ${manager}\n`);

    // Step 1: Ensure Tailwind is setup
    if (!isTailwindSetup(projectRoot)) {
        console.log("📦 Tailwind not detected, setting it up first...\n");
        await addTailwind();
        console.log(""); // Spacing
    } else {
        console.log("✅ Tailwind already setup\n");
    }

    // Step 2: Detect framework
    let framework = detectFramework(projectRoot);

    if (framework === ("both" as any)) {
        framework = await askFramework();
    } else if (!framework) {
        console.error(
            boxen(
                "❌ Could not detect React or Svelte in config/app.ts\n\nPlease ensure you have @primate/react or @primate/svelte configured.",
                {
                    padding: 1,
                    margin: 1,
                    borderStyle: "round",
                    borderColor: "red",
                }
            )
        );
        process.exit(1);
    }

    console.log(`🎯 Detected framework: ${framework}\n`);

    if (framework === "react") {
        await setupShadcnReact(projectRoot, manager);
    } else {
        await setupShadcnSvelte(projectRoot, manager);
    }
}

async function setupShadcnReact(projectRoot: string, manager: string) {
    // Step 1: Install packages
    const spinner = ora(
        "Installing shadcn/ui dependencies for React..."
    ).start();

    try {
        await installPackages(
            projectRoot,
            [
                "class-variance-authority",
                "clsx",
                "tailwind-merge",
                "lucide-react",
                "tw-animate-css",
            ],
            manager as any
        );
        spinner.succeed("Installed shadcn/ui dependencies");
    } catch (error) {
        spinner.fail("Failed to install dependencies");
        throw error;
    }

    // Step 2: Update master.css
    const cssPath = join(projectRoot, "static", "master.css");
    const reactCssContent = `@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.145 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.145 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.637 0.237 25.331);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.439 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(0.269 0 0);
  --sidebar-ring: oklch(0.439 0 0);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;

    writeFileSync(cssPath, reactCssContent);
    console.log("✅ Updated static/master.css with shadcn/ui theme");

    // Step 3: Create utils.js in components/lib/
    const libDir = join(projectRoot, "components", "lib");
    if (!existsSync(libDir)) {
        mkdirSync(libDir, { recursive: true });
    }

    const utilsPath = join(libDir, "utils.js");
    const utilsContent = `import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
`;

    writeFileSync(utilsPath, utilsContent);
    console.log("✅ Created components/lib/utils.js");

    // Step 4: Create components.json
    const componentsJsonPath = join(projectRoot, "components.json");
    const componentsJsonContent = {
        $schema: "https://ui.shadcn.com/schema.json",
        style: "new-york",
        rsc: false,
        tsx: true,
        tailwind: {
            css: "static/master.css",
            baseColor: "slate",
            cssVariables: true,
            config: "",
            prefix: "",
        },
        aliases: {
            components: "components",
            utils: "components/lib/utils",
            ui: "components/ui",
            hooks: "components/ui/hooks",
            lib: "components/lib",
        },
        iconLibrary: "lucide",
    };

    writeFileSync(
        componentsJsonPath,
        JSON.stringify(componentsJsonContent, null, 4)
    );
    console.log("✅ Created components.json");

    // Final success message
    console.log(
        boxen(
            `✅ shadcn/ui for React setup complete!

🎨 Theme configured with CSS variables
🛠️  Utils helper created
📦 Ready to add components with: npx shadcn@latest add

🚀 Run 'px run' to start your Primate project
📚 shadcn/ui docs: https://ui.shadcn.com`,
            {
                padding: 1,
                margin: 1,
                borderStyle: "round",
                borderColor: "green",
            }
        )
    );
}

async function setupShadcnSvelte(projectRoot: string, manager: string) {
    // Step 1: Install packages
    const spinner = ora(
        "Installing shadcn/ui dependencies for Svelte..."
    ).start();

    try {
        await installPackages(
            projectRoot,
            [
                "tailwind-variants",
                "clsx",
                "tailwind-merge",
                "tw-animate-css",
                "@lucide/svelte",
            ],
            manager as any
        );
        spinner.succeed("Installed shadcn/ui dependencies");
    } catch (error) {
        spinner.fail("Failed to install dependencies");
        throw error;
    }

    // Step 2: Update master.css
    const cssPath = join(projectRoot, "static", "master.css");
    const svelteCssContent = `@import "tailwindcss";
@import "tw-animate-css";
@custom-variant dark (&:is(.dark *));
 
:root {
 --radius: 0.625rem;
 --background: oklch(1 0 0);
 --foreground: oklch(0.145 0 0);
 --card: oklch(1 0 0);
 --card-foreground: oklch(0.145 0 0);
 --popover: oklch(1 0 0);
 --popover-foreground: oklch(0.145 0 0);
 --primary: oklch(0.205 0 0);
 --primary-foreground: oklch(0.985 0 0);
 --secondary: oklch(0.97 0 0);
 --secondary-foreground: oklch(0.205 0 0);
 --muted: oklch(0.97 0 0);
 --muted-foreground: oklch(0.556 0 0);
 --accent: oklch(0.97 0 0);
 --accent-foreground: oklch(0.205 0 0);
 --destructive: oklch(0.577 0.245 27.325);
 --border: oklch(0.922 0 0);
 --input: oklch(0.922 0 0);
 --ring: oklch(0.708 0 0);
 --chart-1: oklch(0.646 0.222 41.116);
 --chart-2: oklch(0.6 0.118 184.704);
 --chart-3: oklch(0.398 0.07 227.392);
 --chart-4: oklch(0.828 0.189 84.429);
 --chart-5: oklch(0.769 0.188 70.08);
 --sidebar: oklch(0.985 0 0);
 --sidebar-foreground: oklch(0.145 0 0);
 --sidebar-primary: oklch(0.205 0 0);
 --sidebar-primary-foreground: oklch(0.985 0 0);
 --sidebar-accent: oklch(0.97 0 0);
 --sidebar-accent-foreground: oklch(0.205 0 0);
 --sidebar-border: oklch(0.922 0 0);
 --sidebar-ring: oklch(0.708 0 0);
}
 
.dark {
 --background: oklch(0.145 0 0);
 --foreground: oklch(0.985 0 0);
 --card: oklch(0.205 0 0);
 --card-foreground: oklch(0.985 0 0);
 --popover: oklch(0.269 0 0);
 --popover-foreground: oklch(0.985 0 0);
 --primary: oklch(0.922 0 0);
 --primary-foreground: oklch(0.205 0 0);
 --secondary: oklch(0.269 0 0);
 --secondary-foreground: oklch(0.985 0 0);
 --muted: oklch(0.269 0 0);
 --muted-foreground: oklch(0.708 0 0);
 --accent: oklch(0.371 0 0);
 --accent-foreground: oklch(0.985 0 0);
 --destructive: oklch(0.704 0.191 22.216);
 --border: oklch(1 0 0 / 10%);
 --input: oklch(1 0 0 / 15%);
 --ring: oklch(0.556 0 0);
 --chart-1: oklch(0.488 0.243 264.376);
 --chart-2: oklch(0.696 0.17 162.48);
 --chart-3: oklch(0.769 0.188 70.08);
 --chart-4: oklch(0.627 0.265 303.9);
 --chart-5: oklch(0.645 0.246 16.439);
 --sidebar: oklch(0.205 0 0);
 --sidebar-foreground: oklch(0.985 0 0);
 --sidebar-primary: oklch(0.488 0.243 264.376);
 --sidebar-primary-foreground: oklch(0.985 0 0);
 --sidebar-accent: oklch(0.269 0 0);
 --sidebar-accent-foreground: oklch(0.985 0 0);
 --sidebar-border: oklch(1 0 0 / 10%);
 --sidebar-ring: oklch(0.439 0 0);
}
 
@theme inline {
 --radius-sm: calc(var(--radius) - 4px);
 --radius-md: calc(var(--radius) - 2px);
 --radius-lg: var(--radius);
 --radius-xl: calc(var(--radius) + 4px);
 --color-background: var(--background);
 --color-foreground: var(--foreground);
 --color-card: var(--card);
 --color-card-foreground: var(--card-foreground);
 --color-popover: var(--popover);
 --color-popover-foreground: var(--popover-foreground);
 --color-primary: var(--primary);
 --color-primary-foreground: var(--primary-foreground);
 --color-secondary: var(--secondary);
 --color-secondary-foreground: var(--secondary-foreground);
 --color-muted: var(--muted);
 --color-muted-foreground: var(--muted-foreground);
 --color-accent: var(--accent);
 --color-accent-foreground: var(--accent-foreground);
 --color-destructive: var(--destructive);
 --color-border: var(--border);
 --color-input: var(--input);
 --color-ring: var(--ring);
 --color-chart-1: var(--chart-1);
 --color-chart-2: var(--chart-2);
 --color-chart-3: var(--chart-3);
 --color-chart-4: var(--chart-4);
 --color-chart-5: var(--chart-5);
 --color-sidebar: var(--sidebar);
 --color-sidebar-foreground: var(--sidebar-foreground);
 --color-sidebar-primary: var(--sidebar-primary);
 --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
 --color-sidebar-accent: var(--sidebar-accent);
 --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
 --color-sidebar-border: var(--sidebar-border);
 --color-sidebar-ring: var(--sidebar-ring);
}
 
@layer base {
 * {
  @apply border-border outline-ring/50;
 }
 
 body {
  @apply bg-background text-foreground;
 }
}
`;

    writeFileSync(cssPath, svelteCssContent);
    console.log("✅ Updated static/master.css with shadcn/ui theme");

    // Step 3: Create utils.js in components/lib/
    const libDir = join(projectRoot, "components", "lib");
    if (!existsSync(libDir)) {
        mkdirSync(libDir, { recursive: true });
    }

    const utilsPath = join(libDir, "utils.js");
    const utilsContent = `import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
 
export function cn(...inputs) {
 return twMerge(clsx(inputs));
}
`;

    writeFileSync(utilsPath, utilsContent);
    console.log("✅ Created components/lib/utils.js");

    // Step 4: Create components.json
    const componentsJsonPath = join(projectRoot, "components.json");
    const componentsJsonContent = {
        $schema: "https://shadcn-svelte.com/schema.json",
        tailwind: {
            css: "static/master.css",
            baseColor: "slate",
        },
        aliases: {
            components: "components",
            utils: "components/lib/utils",
            ui: "components/ui",
            hooks: "components/ui/hooks",
            lib: "components/lib",
        },
        typescript: true,
        registry: "https://shadcn-svelte.com/registry",
    };

    writeFileSync(
        componentsJsonPath,
        JSON.stringify(componentsJsonContent, null, 4)
    );
    console.log("✅ Created components.json");

    // Final success message
    console.log(
        boxen(
            `✅ shadcn/ui for Svelte setup complete!

🎨 Theme configured with CSS variables
🛠️  Utils helper created
📦 Ready to add components with: npx shadcn-svelte@latest add

🚀 Run 'px run' to start your Primate project
📚 shadcn-svelte docs: https://shadcn-svelte.com`,
            {
                padding: 1,
                margin: 1,
                borderStyle: "round",
                borderColor: "green",
            }
        )
    );
}
