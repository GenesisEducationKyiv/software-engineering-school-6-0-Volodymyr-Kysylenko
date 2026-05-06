import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
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
