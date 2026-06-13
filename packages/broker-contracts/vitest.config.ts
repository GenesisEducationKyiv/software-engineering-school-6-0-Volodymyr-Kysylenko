import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["src/__tests__/*.test.ts"],
        exclude: ["node_modules/**", "dist/**"],
        coverage: {
            provider: "v8",
            exclude: ["node_modules/", "dist/", "coverage/", "**/*.config.*", "**/*.d.ts", "**/index.ts"],
        },
    },
});
