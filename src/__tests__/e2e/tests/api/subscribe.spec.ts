import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { TEST_REPO, uniqueEmail } from "../../helpers/constants.js";

const ORIGIN = process.env.APP_BASE_URL ?? "http://localhost:3001";
const FAKE_REPO = "this-user-does-not-exist-playwright-e2e/this-repo-does-not-exist-playwright-e2e";

const subscribe = async (request: APIRequestContext, email: string, repo: string) =>
    request.post("/api/subscribe", {
        headers: { "Content-Type": "application/json", Origin: ORIGIN },
        data: { email, repo },
    });

test.describe("POST /api/subscribe", () => {
    test("creates a subscription successfully and returns 201", async ({ request }) => {
        const email = uniqueEmail();
        const response = await subscribe(request, email, TEST_REPO);

        expect(response.status()).toBe(201);

        const body = await response.json();
        expect(body).toEqual({ message: "Subscription successful. Confirmation email sent." });
    });

    test("returns 400 VALIDATION_ERROR for invalid email format", async ({ request }) => {
        const response = await subscribe(request, "not-an-email", TEST_REPO);

        expect(response.status()).toBe(400);

        const body = await response.json();
        expect(body.code).toBe("VALIDATION_ERROR");
        expect(body).toHaveProperty("message");
    });

    test("returns 400 VALIDATION_ERROR for invalid repo format (missing slash)", async ({ request }) => {
        const response = await subscribe(request, uniqueEmail(), "invalid-repo-no-slash");

        expect(response.status()).toBe(400);

        const body = await response.json();
        expect(body.code).toBe("VALIDATION_ERROR");
    });

    test("returns 400 when required fields are missing", async ({ request }) => {
        const response = await request.post("/api/subscribe", {
            headers: { "Content-Type": "application/json", Origin: ORIGIN },
            data: {},
        });

        expect(response.status()).toBe(400);

        const body = await response.json();
        expect(body.code).toBe("VALIDATION_ERROR");
    });

    test("returns 404 when GitHub repository does not exist", async ({ request }) => {
        const response = await subscribe(request, uniqueEmail(), FAKE_REPO);

        expect(response.status()).toBe(404);
    });

    test("returns 409 RESOURCE_CONFLICT on duplicate subscription", async ({ request }) => {
        const email = uniqueEmail();

        const first = await subscribe(request, email, TEST_REPO);
        expect(first.status()).toBe(201);

        const second = await subscribe(request, email, TEST_REPO);
        expect(second.status()).toBe(409);

        const body = await second.json();
        expect(body.code).toBe("RESOURCE_CONFLICT");
    });

    test("returns 403 when Origin header is missing on POST", async ({ request }) => {
        const response = await request.post("/api/subscribe", {
            headers: { "Content-Type": "application/json" },
            data: { email: uniqueEmail(), repo: TEST_REPO },
        });

        expect(response.status()).toBe(403);
    });
});
