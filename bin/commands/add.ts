import boxen from "boxen";
import { addTailwind } from "./add/tailwind.ts";
import { addShadcn } from "./add/shadcn.ts";
import { addTest } from "./add/test.ts";

export async function addCommand(module: string) {
    switch (module.toLowerCase()) {
        case "tailwind":
            await addTailwind();
            break;
        case "shadcn":
            await addShadcn();
            break;
        case "test":
            await addTest();
            break;
        default:
            console.error(
                boxen(
                    `❌ Unknown module: ${module}\n\nAvailable modules:\n  - tailwind\n  - shadcn\n  - test`,
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
