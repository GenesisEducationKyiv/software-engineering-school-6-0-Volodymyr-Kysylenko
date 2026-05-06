import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            provider: "v8",
            exclude: [
                "node_modules/",
                "dist/",
                "public/",
                "scripts/",
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
