export const vitestConfigContent = `import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [
        svelte({
            compilerOptions: {
                dev: true,
            },
        }),
    ],
    test: {
        include: [
            "components/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        ],
        browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
        },
        setupFiles: ["./vitest-setup-client.ts"],
    },
});
`;

