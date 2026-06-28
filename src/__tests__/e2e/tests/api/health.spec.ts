import { expect, test } from "@playwright/test";

test.describe("GET /api/health", () => {
    test("returns 200 with full health status structure", async ({ request }) => {
        const response = await request.get("/api/health");

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body).toHaveProperty("status");
        expect(body).toHaveProperty("timestamp");
        expect(body).toHaveProperty("uptime");
        expect(body).toHaveProperty("checks");
        expect(typeof body.uptime).toBe("number");
        expect(body.uptime).toBeGreaterThan(0);
    });

    test("timestamp is a valid ISO 8601 string", async ({ request }) => {
        const response = await request.get("/api/health");
        const body = await response.json();

        const parsed = new Date(body.timestamp as string);
        expect(parsed.toISOString()).toBe(body.timestamp);
    });

    test("status field is a valid health status", async ({ request }) => {
        const response = await request.get("/api/health");
        const body = await response.json();

        expect(["healthy", "unhealthy", "degraded"]).toContain(body.status);
    });

    test("responds within 2 seconds", async ({ request }) => {
        const start = Date.now();
        await request.get("/api/health");
        expect(Date.now() - start).toBeLessThan(2000);
    });

    test("does not require Origin header (GET method)", async ({ request }) => {
        const response = await request.get("/api/health", { headers: {} });
        expect(response.status()).toBe(200);
    });
});
