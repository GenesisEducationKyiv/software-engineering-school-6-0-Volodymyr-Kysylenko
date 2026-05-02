import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { Express } from "express";
import type { Server } from "http";
import { createApp } from "../../app.js";
import { pool } from "../../db/pool.js";
import { runMigrations } from "../../db/migrate.js";
import { env } from "../../config/env.js";

describe("Subscription API Integration Tests", () => {
    let app: Express;
    let server: Server;
    let canConnectToDatabase = false;
    const baseURL = env.APP_BASE_URL || `http://localhost:${env.PORT}`;

    beforeAll(async () => {
        console.log("Test environment:", {
            NODE_ENV: env.NODE_ENV,
            PORT: env.PORT,
            DATABASE_URL: env.DATABASE_URL?.replace(/:[^:@]*@/, ":***@"), // Hide password
            REDIS_URL: env.REDIS_URL,
            APP_BASE_URL: env.APP_BASE_URL,
            SMTP_HOST: env.SMTP_HOST,
            SMTP_PORT: env.SMTP_PORT,
            SMTP_EMAIL_FROM: env.SMTP_EMAIL_FROM,
            SMTP_SECURE: env.SMTP_SECURE,
            CACHE_ENABLED: env.CACHE_ENABLED,
            GITHUB_TOKEN: env.GITHUB_TOKEN ? "[SET]" : "[NOT SET]",
        });

        try {
            await pool.query("SELECT 1");
            await runMigrations();
            app = createApp();

            server = app.listen(env.PORT);
            canConnectToDatabase = true;
        } catch (error) {
            console.warn("Database connection failed, skipping integration tests:", error);
            canConnectToDatabase = false;
        }
    });

    afterAll(async () => {
        if (server) {
            server.close();
        }
        if (canConnectToDatabase) {
            await pool.end();
        }
    });

    beforeEach(async () => {
        if (!canConnectToDatabase) {
            return;
        }
        await pool.query("TRUNCATE TABLE subscriptions CASCADE");
    });

    describe("POST /api/subscribe", () => {
        it("should create a subscription successfully", async () => {
            if (!canConnectToDatabase) {
                console.warn("Skipping test: database not available");
                return;
            }

            const subscriptionData = {
                email: "test@example.com",
                repo: "facebook/react",
            };

            const response = await fetch(`${baseURL}/api/subscribe`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Origin: baseURL,
                },
                body: JSON.stringify(subscriptionData),
            });

            if (response.status !== 201) {
                const responseText = await response.text();
                console.error(`Subscribe API failed with ${response.status}:`, responseText);
            }

            expect(response.status).toBe(201);

            const responseData = await response.json();
            expect(responseData).toEqual({
                message: "Subscription successful. Confirmation email sent.",
            });

            const result = await pool.query("SELECT * FROM subscriptions WHERE email = $1 AND repo_full_name = $2", [
                subscriptionData.email,
                subscriptionData.repo,
            ]);

            expect(result.rows).toHaveLength(1);
            expect(result.rows[0].confirmed).toBe(false);
        });

        it("should return validation error for invalid email", async () => {
            if (!canConnectToDatabase) {
                console.warn("Skipping test: database not available");
                return;
            }

            const response = await fetch(`${baseURL}/api/subscribe`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Origin: baseURL,
                },
                body: JSON.stringify({
                    email: "invalid-email",
                    repo: "facebook/react",
                }),
            });

            expect(response.status).toBe(400);

            const responseData = await response.json();
            expect(responseData).toHaveProperty("message");
            expect(responseData.code).toBe("VALIDATION_ERROR");
        });

        it("should return conflict error for duplicate subscription", async () => {
            if (!canConnectToDatabase) {
                console.warn("Skipping test: database not available");
                return;
            }

            const subscriptionData = {
                email: "test@example.com",
                repo: "facebook/react",
            };

            const firstResponse = await fetch(`${baseURL}/api/subscribe`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Origin: baseURL,
                },
                body: JSON.stringify(subscriptionData),
            });

            if (firstResponse.status !== 201) {
                const responseText = await firstResponse.text();
                console.error(`First subscribe API failed with ${firstResponse.status}:`, responseText);
            }

            expect(firstResponse.status).toBe(201);

            const response = await fetch(`${baseURL}/api/subscribe`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Origin: baseURL,
                },
                body: JSON.stringify(subscriptionData),
            });

            expect(response.status).toBe(409);

            const responseData = await response.json();
            expect(responseData.code).toBe("RESOURCE_CONFLICT");
        });
    });

    describe("GET /api/health", () => {
        it("should return health status", async () => {
            if (!canConnectToDatabase) {
                console.warn("Skipping test: database not available");
                return;
            }

            const response = await fetch(`${baseURL}/api/health`);

            expect(response.status).toBe(200);

            const responseData = await response.json();
            expect(responseData).toHaveProperty("status");
            expect(responseData).toHaveProperty("timestamp");
            expect(responseData).toHaveProperty("uptime");
            expect(responseData).toHaveProperty("checks");
        });
    });

    describe("Rate Limiting", () => {
        it("should apply rate limiting after threshold", async () => {
            if (!canConnectToDatabase) {
                console.warn("Skipping test: database not available");
                return;
            }

            const requests = Array(101)
                .fill(null)
                .map(() => fetch(`${baseURL}/api/health`));

            const responses = await Promise.all(requests);

            const rateLimitedResponses = responses.filter((r) => r.status === 429);
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });
    });
});
