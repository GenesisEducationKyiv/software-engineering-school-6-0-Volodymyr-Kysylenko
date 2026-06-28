import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.e2e" });

const BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3001";

export default defineConfig({
    testDir: "./src/__tests__/e2e",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: [["html", { outputFolder: "playwright-report", open: "never" }], ["line"]],
    globalSetup: "./src/__tests__/e2e/global-setup.ts",
    use: {
        baseURL: BASE_URL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
    },
    projects: [
        {
            name: "api",
            testMatch: "**/api/**/*.spec.ts",
        },
        {
            name: "ui",
            use: { ...devices["Desktop Chrome"] },
            testMatch: "**/ui/**/*.spec.ts",
        },
    ],
    webServer: {
        command: "tsx src/server.ts",
        url: `${BASE_URL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        stderr: "pipe",
        stdout: "pipe",
    },
});
