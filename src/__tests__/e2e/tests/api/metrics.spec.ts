import { expect, test } from "@playwright/test";

test.describe("GET /api/metrics", () => {
    test("returns 200 with Prometheus text format", async ({ request }) => {
        const response = await request.get("/api/metrics");

        expect(response.status()).toBe(200);

        const contentType = response.headers()["content-type"] ?? "";
        expect(contentType).toContain("text/plain");
    });

    test("response body contains standard Prometheus metric lines", async ({ request }) => {
        const response = await request.get("/api/metrics");
        const body = await response.text();

        expect(body).toMatch(/^# (HELP|TYPE) /m);
    });

    test("does not require Origin header (GET method)", async ({ request }) => {
        const response = await request.get("/api/metrics");
        expect(response.status()).toBe(200);
    });
});
