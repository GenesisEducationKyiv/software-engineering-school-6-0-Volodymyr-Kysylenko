import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["src/__tests__/*.test.ts"],
        exclude: ["node_modules/**", "dist/**", "src/__tests__/e2e/**"],
        coverage: {
            provider: "v8",
            exclude: [
                "node_modules/",
                "dist/",
                "public/",
                "coverage/",
                "src/server.ts",
                "src/app.ts",
                "**/*.config.*",
                "**/*.d.ts",
                "**/migrations/**",
                "**/generated/**",
                "**/index.ts",
            ],
        },
    },
});
