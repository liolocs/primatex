import boxen from "boxen";
import { addShadcn } from "./shadcn.ts";
import { addTailwind } from "./tailwind.ts";

export async function addCommand(module: string) {
    switch (module.toLowerCase()) {
        case "tailwind":
            await addTailwind();
            break;
        case "shadcn":
            await addShadcn();
            break;
        default:
            console.error(
                boxen(
                    `❌ Unknown module: ${module}\n\nAvailable modules:\n  - tailwind\n  - shadcn`,
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
