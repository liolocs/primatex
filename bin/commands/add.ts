import boxen from "boxen";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import ora from "ora";
import { join } from "path";
import { installPackages } from "../utils/packages.ts";
import { detectManager, findProjectRoot } from "../utils/project.ts";

export async function addCommand(module: string) {
    switch (module.toLowerCase()) {
        case "tailwind":
            await addTailwind();
            break;
        default:
            console.error(
                boxen(
                    `❌ Unknown module: ${module}\n\nAvailable modules:\n  - tailwind`,
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
}

async function addTailwind() {
    const projectRoot = findProjectRoot(process.cwd());
    const manager = detectManager(projectRoot);

    console.log(
        boxen("🎨 Setting up Tailwind CSS for Primate", {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "cyan",
        })
    );

    console.log(`📂 Project root: ${projectRoot}`);
    console.log(`📋 Package manager: ${manager}\n`);

    // Step 1: Install packages
    const spinner = ora("Installing Tailwind CSS and dependencies...").start();

    try {
        await installPackages(
            projectRoot,
            ["@primate/tailwind", "tailwindcss"],
            manager
        );
        spinner.succeed("Installed Tailwind CSS dependencies");
    } catch (error) {
        spinner.fail("Failed to install dependencies");
        throw error;
    }

    // Step 2: Create tailwind.config.js
    const tailwindConfigPath = join(projectRoot, "tailwind.config.js");
    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./views/**/*.{js,ts,jsx,tsx,svelte,vue}",
    "./components/**/*.{js,ts,jsx,tsx,svelte,vue}",
    "./routes/**/*.{js,ts}",
    "./lib/**/*.{js,ts,jsx,tsx,svelte,vue}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
`;

    if (existsSync(tailwindConfigPath)) {
        console.log("⚠️  tailwind.config.js already exists, skipping...");
    } else {
        writeFileSync(tailwindConfigPath, tailwindConfig);
        console.log("✅ Created tailwind.config.js");
    }

    // Step 3: Create static directory and CSS file
    const staticDir = join(projectRoot, "static");
    if (!existsSync(staticDir)) {
        mkdirSync(staticDir, { recursive: true });
    }

    const cssPath = join(staticDir, "master.css");
    const cssContent = `@import "tailwindcss";`;

    if (existsSync(cssPath)) {
        const existing = readFileSync(cssPath, "utf-8");
        if (!existing.includes("@tailwind")) {
            // Append tailwind directives
            writeFileSync(cssPath, cssContent + "\n" + existing);
            console.log("✅ Added Tailwind directives to existing master.css");
        } else {
            console.log(
                "⚠️  master.css already contains Tailwind directives, skipping..."
            );
        }
    } else {
        writeFileSync(cssPath, cssContent);
        console.log("✅ Created static/master.css with Tailwind directives");
    }

    // Step 4: Update or create config/app.ts
    const configDir = join(projectRoot, "config");
    if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
    }

    const appConfigPath = join(configDir, "app.ts");
    let appConfigUpdated = false;

    if (existsSync(appConfigPath)) {
        const existingConfig = readFileSync(appConfigPath, "utf-8");

        // Check if CSS is already configured
        if (
            !existingConfig.includes("/master.css") &&
            !existingConfig.includes("master.css")
        ) {
            // Try to add CSS import intelligently
            if (existingConfig.includes("export default")) {
                const updatedConfig = existingConfig.replace(
                    /export default\s*{/,
                    `export default {\n  css: ["/master.css"],`
                );
                writeFileSync(appConfigPath, updatedConfig);
                console.log("✅ Updated config/app.ts to include master.css");
                appConfigUpdated = true;
            } else {
                console.log(
                    "⚠️  Please manually add this to your config/app.ts:"
                );
                console.log(`\n  css: ["/master.css"],\n`);
            }
        } else {
            console.log("⚠️  config/app.ts already references master.css");
            appConfigUpdated = true;
        }
    } else {
        // Create new config file
        const newConfig = `export default {
  css: ["/master.css"],
};
`;
        writeFileSync(appConfigPath, newConfig);
        console.log("✅ Created config/app.ts with CSS configuration");
        appConfigUpdated = true;
    }

    // Final success message
    const manualStepMsg = !appConfigUpdated
        ? '⚠️  Manual step required:\n   Add css: ["/master.css"] to config/app.ts\n\n'
        : "";

    console.log(
        boxen(
            `✅ Tailwind CSS setup complete!

${manualStepMsg}🚀 Run 'px run' to start your Primate project
📚 Tailwind docs: https://tailwindcss.com/docs`,
            {
                padding: 1,
                margin: 1,
                borderStyle: "round",
                borderColor: "green",
            }
        )
    );
}
