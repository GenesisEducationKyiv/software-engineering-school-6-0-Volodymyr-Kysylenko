import { expect, type Page, test } from "@playwright/test";

const ORIGIN = process.env.APP_BASE_URL ?? "http://localhost:3001";
const TEST_REPO = "facebook/react";
const uniqueEmail = () => `ui-subs-${Date.now()}-${Math.floor(Math.random() * 9999)}@example.com`;

test.describe("Subscriptions page", () => {
    const disableNativeValidation = async (page: Page) => {
        await page.locator("#search-form").evaluate((form) => {
            form.setAttribute("novalidate", "");
        });
    };

    test.beforeEach(async ({ page }) => {
        await page.goto("/subscriptions");
    });

    test("loads with correct title and search form", async ({ page }) => {
        await expect(page.locator("#search-form")).toBeVisible();
        await expect(page.locator("#email")).toBeVisible();
        await expect(page.locator("#check-button")).toBeVisible();
    });

    test("shows error when email is empty on submit", async ({ page }) => {
        await disableNativeValidation(page);
        await page.locator("#check-button").click();

        const message = page.locator("#search-message");
        await expect(message).toBeVisible();
        await expect(message).toHaveText("Вкажи email.");
    });

    test("shows 'no subscriptions' for email with no active subscriptions", async ({ page }) => {
        await page.locator("#email").fill("nobody-here@example.com");
        await page.locator("#check-button").click();

        const list = page.locator("#subscriptions-list");
        await expect(list).toBeVisible({ timeout: 10_000 });
        await expect(list).toContainText("Підписки не знайдено");
    });

    test("shows subscription list with repo link and status", async ({ page, request }) => {
        const email = uniqueEmail();

        await request.post("/api/subscribe", {
            headers: { "Content-Type": "application/json", Origin: ORIGIN },
            data: { email, repo: TEST_REPO },
        });

        await page.locator("#email").fill(email);
        await page.locator("#check-button").click();

        const list = page.locator("#subscriptions-list");
        await expect(list).toBeVisible({ timeout: 10_000 });

        const repoLink = list.locator(`a[href="https://github.com/${TEST_REPO}"]`);
        await expect(repoLink).toBeVisible();
        await expect(repoLink).toHaveText(TEST_REPO);

        await expect(list).toContainText("Очікує підтвердження");
    });

    test("link to create new subscription navigates to home", async ({ page }) => {
        const link = page.locator("a", { hasText: "Створити нову підписку" });
        await expect(link).toBeVisible();

        await link.click();
        await expect(page).toHaveURL(/\/$/);
    });
});
