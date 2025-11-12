import boxen from "boxen";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import ora from "ora";
import { join } from "path";
import { installPackages } from "../../utils/packages.ts";
import { detectManager, findProjectRoot } from "../../utils/project.ts";

export async function addTailwind() {
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
        if (!existing.includes("@import \"tailwindcss\"")) {
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
        let existingConfig = readFileSync(appConfigPath, "utf-8");

        // Check if tailwind is already imported
        if (!existingConfig.includes("@primate/tailwind")) {
            // Add tailwind import after other imports
            const importRegex = /(import\s+\w+\s+from\s+["']@primate\/\w+["'];?\s*\n)/g;
            const matches = existingConfig.match(importRegex);
            
            if (matches && matches.length > 0) {
                // Add after the last @primate import
                const lastImport = matches[matches.length - 1];
                const lastImportIndex = existingConfig.lastIndexOf(lastImport);
                const insertPosition = lastImportIndex + lastImport.length;
                
                existingConfig = 
                    existingConfig.slice(0, insertPosition) +
                    'import tailwind from "@primate/tailwind";\n' +
                    existingConfig.slice(insertPosition);
            } else {
                // Add at the beginning if no @primate imports found
                existingConfig = 'import tailwind from "@primate/tailwind";\n' + existingConfig;
            }

            // Add tailwind() to modules array
            if (existingConfig.includes("modules:")) {
                // Find the modules array and add tailwind()
                existingConfig = existingConfig.replace(
                    /modules:\s*\[([^\]]*)\]/,
                    (match, modulesList) => {
                        // Check if tailwind() is already in the list
                        if (modulesList.includes("tailwind()")) {
                            return match;
                        }
                        // Add tailwind() to the modules list
                        const trimmedModules = modulesList.trim();
                        if (trimmedModules === "") {
                            return `modules: [tailwind()]`;
                        }
                        // Check if the list ends with a comma or not
                        const needsComma = trimmedModules.endsWith(",") ? "" : ",";
                        return `modules: [${modulesList}${needsComma} tailwind()]`;
                    }
                );
            } else {
                // Add modules array if it doesn't exist
                existingConfig = existingConfig.replace(
                    /export default config\(\{/,
                    `export default config({\n    modules: [tailwind()],`
                );
            }

            writeFileSync(appConfigPath, existingConfig);
            console.log("✅ Updated config/app.ts to include @primate/tailwind module");
            appConfigUpdated = true;
        } else {
            console.log("⚠️  config/app.ts already includes @primate/tailwind");
            appConfigUpdated = true;
        }
    } else {
        // Create new config file with tailwind
        const newConfig = `import tailwind from "@primate/tailwind";
import config from "primate/config";

export default config({
    modules: [tailwind()],
});
`;
        writeFileSync(appConfigPath, newConfig);
        console.log("✅ Created config/app.ts with Tailwind configuration");
        appConfigUpdated = true;
    }

    // Final success message
    const manualStepMsg = !appConfigUpdated
        ? '⚠️  Manual step required:\n   Add tailwind module to config/app.ts\n\n'
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
    
    return { projectRoot, manager };
}

// Check if tailwind is already setup
export function isTailwindSetup(projectRoot: string): boolean {
    // Check 1: config/app.ts includes @primate/tailwind
    const appConfigPath = join(projectRoot, "config", "app.ts");
    if (!existsSync(appConfigPath)) {
        return false;
    }
    const config = readFileSync(appConfigPath, "utf-8");
    if (!config.includes("@primate/tailwind")) {
        return false;
    }

    // Check 2: tailwind.config.js exists
    const tailwindConfigPath = join(projectRoot, "tailwind.config.js");
    if (!existsSync(tailwindConfigPath)) {
        return false;
    }

    // Check 3: static/master.css exists
    const masterCssPath = join(projectRoot, "static", "master.css");
    if (!existsSync(masterCssPath)) {
        return false;
    }

    return true;
}

