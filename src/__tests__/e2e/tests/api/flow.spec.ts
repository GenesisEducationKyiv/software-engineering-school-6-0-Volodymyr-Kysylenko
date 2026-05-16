import { expect, test } from "@playwright/test";

import { createSubscription } from "../../helpers/db.js";

const TEST_REPO = "facebook/react";

const uniqueEmail = () => `flow-${Date.now()}-${Math.floor(Math.random() * 9999)}@example.com`;

test.describe("Full subscription lifecycle", () => {
    test("confirm → list (confirmed) → unsubscribe → list (empty)", async ({ request }) => {
        const email = uniqueEmail();

        const sub = await createSubscription({
            email,
            repo: TEST_REPO,
            confirmed: false,
            unsubscribed: false,
        });

        const confirmRes = await request.get(`/api/confirm/${sub.confirm_token}`);
        expect(confirmRes.status()).toBe(200);
        const confirmBody = await confirmRes.json();
        expect(confirmBody.message).toBe("Subscription confirmed successfully");

        const listRes = await request.get(`/api/subscriptions?email=${encodeURIComponent(email)}`);
        expect(listRes.status()).toBe(200);
        const list = await listRes.json();
        expect(list).toHaveLength(1);
        expect(list[0].confirmed).toBe(true);
        expect(list[0].repo).toBe(TEST_REPO);

        const unsubRes = await request.get(`/api/unsubscribe/${sub.unsubscribe_token}`);
        expect(unsubRes.status()).toBe(200);
        const unsubBody = await unsubRes.json();
        expect(unsubBody.message).toBe("Unsubscribed successfully");

        const finalListRes = await request.get(`/api/subscriptions?email=${encodeURIComponent(email)}`);
        expect(finalListRes.status()).toBe(200);
        const finalList = await finalListRes.json();
        expect(finalList).toHaveLength(0);
    });

    test("unconfirmed subscription appears in list as not confirmed", async ({ request }) => {
        const email = uniqueEmail();

        await createSubscription({
            email,
            repo: TEST_REPO,
            confirmed: false,
            unsubscribed: false,
        });

        const listRes = await request.get(`/api/subscriptions?email=${encodeURIComponent(email)}`);
        expect(listRes.status()).toBe(200);

        const list = await listRes.json();
        expect(list).toHaveLength(1);
        expect(list[0].confirmed).toBe(false);
        expect(list[0].email).toBe(email);
    });

    test("confirm with invalid token format returns 400", async ({ request }) => {
        const response = await request.get("/api/confirm/invalid-token-that-does-not-exist");
        expect(response.status()).toBe(400);
    });

    test("unsubscribe with invalid token format returns 400", async ({ request }) => {
        const response = await request.get("/api/unsubscribe/invalid-token-that-does-not-exist");
        expect(response.status()).toBe(400);
    });

    test("confirm with valid but unknown token returns 404", async ({ request }) => {
        const response = await request.get(`/api/confirm/${"a".repeat(48)}`);
        expect(response.status()).toBe(404);
    });

    test("unsubscribe with valid but unknown token returns 404", async ({ request }) => {
        const response = await request.get(`/api/unsubscribe/${"b".repeat(48)}`);
        expect(response.status()).toBe(404);
    });

    test("confirming the same subscription twice is idempotent", async ({ request }) => {
        const email = uniqueEmail();

        const sub = await createSubscription({
            email,
            repo: TEST_REPO,
            confirmed: false,
            unsubscribed: false,
        });

        const first = await request.get(`/api/confirm/${sub.confirm_token}`);
        expect(first.status()).toBe(200);

        const second = await request.get(`/api/confirm/${sub.confirm_token}`);
        expect(second.status()).toBe(200);
    });
});
