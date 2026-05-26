import { expect, test } from "@playwright/test";

import { TEST_REPO, uniqueEmail } from "../../helpers/constants.js";
import { createSubscription } from "../../helpers/db.js";

test.describe("GET /api/subscriptions", () => {
    test("returns 200 with empty array for email with no subscriptions", async ({ request }) => {
        const response = await request.get(`/api/subscriptions?email=${encodeURIComponent("nobody@example.com")}`);

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(Array.isArray(body)).toBe(true);
        expect(body).toHaveLength(0);
    });

    test("returns 400 VALIDATION_ERROR for invalid email format", async ({ request }) => {
        const response = await request.get("/api/subscriptions?email=not-valid-email");

        expect(response.status()).toBe(400);

        const body = await response.json();
        expect(body.code).toBe("VALIDATION_ERROR");
    });

    test("returns 400 when email query param is missing", async ({ request }) => {
        const response = await request.get("/api/subscriptions");

        expect(response.status()).toBe(400);
    });

    test("returns subscriptions with correct shape for existing email", async ({ request }) => {
        const email = uniqueEmail();

        await createSubscription({
            email,
            repo: TEST_REPO,
            confirmed: false,
            unsubscribed: false,
        });

        const response = await request.get(`/api/subscriptions?email=${encodeURIComponent(email)}`);
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body).toHaveLength(1);

        const sub = body[0];
        expect(sub).toHaveProperty("email", email);
        expect(sub).toHaveProperty("repo", TEST_REPO);
        expect(sub).toHaveProperty("confirmed");
        expect(sub).toHaveProperty("last_seen_tag");
    });

    test("does not return unsubscribed subscriptions", async ({ request }) => {
        const email = uniqueEmail();

        await createSubscription({
            email,
            repo: TEST_REPO,
            confirmed: true,
            unsubscribed: true,
        });

        await createSubscription({
            email,
            repo: "microsoft/vscode",
            confirmed: true,
            unsubscribed: false,
        });

        const response = await request.get(`/api/subscriptions?email=${encodeURIComponent(email)}`);
        const body = await response.json();

        expect(body).toHaveLength(1);
        expect(body[0]).toHaveProperty("repo", "microsoft/vscode");
    });
});
