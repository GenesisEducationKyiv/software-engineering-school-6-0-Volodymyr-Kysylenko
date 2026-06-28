import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["src/__tests__/*.test.ts"],
        exclude: ["node_modules/**", "dist/**"],
        coverage: {
            provider: "v8",
            exclude: [
                "node_modules/",
                "dist/",
                "coverage/",
                "src/server.ts",
                "src/app.ts",
                "**/*.config.*",
                "**/*.d.ts",
            ],
        },
    },
});
