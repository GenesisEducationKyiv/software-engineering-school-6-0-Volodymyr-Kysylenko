import { expect, type Page, test } from "@playwright/test";

const TEST_REPO = "facebook/react";
const uniqueEmail = () => `ui-home-${Date.now()}-${Math.floor(Math.random() * 9999)}@example.com`;

test.describe("Home page — subscription form", () => {
    const disableNativeValidation = async (page: Page) => {
        await page.locator("#subscribe-form").evaluate((form) => {
            form.setAttribute("novalidate", "");
        });
    };

    test.beforeEach(async ({ page }) => {
        await page.goto("/");
    });

    test("loads with correct title and visible form", async ({ page }) => {
        await expect(page.locator("#subscribe-form")).toBeVisible();
        await expect(page.locator("#email")).toBeVisible();
        await expect(page.locator("#repo")).toBeVisible();
        await expect(page.locator("#submit-button")).toBeVisible();
    });

    test("shows error when email field is empty on submit", async ({ page }) => {
        await disableNativeValidation(page);
        await page.locator("#submit-button").click();

        const message = page.locator("#message");
        await expect(message).toBeVisible();
        await expect(message).toHaveText("Вкажіть email.");
    });

    test("shows error when repo field is empty on submit", async ({ page }) => {
        await disableNativeValidation(page);
        await page.locator("#email").fill("user@example.com");
        await page.locator("#submit-button").click();

        const message = page.locator("#message");
        await expect(message).toBeVisible();
        await expect(message).toHaveText("Вкажіть GitHub-репозиторій.");
    });

    test("shows error for invalid repo format (no slash)", async ({ page }) => {
        await disableNativeValidation(page);
        await page.locator("#email").fill("user@example.com");
        await page.locator("#repo").fill("invalid-no-slash");
        await page.locator("#submit-button").click();

        const message = page.locator("#message");
        await expect(message).toBeVisible();
        await expect(message).toHaveText("Некоректний формат репозиторію. Використовуйте owner/repo.");
    });

    test("shows success message after valid subscription", async ({ page }) => {
        const email = uniqueEmail();

        await page.route("**/api/subscribe", async (route) => {
            await route.fulfill({
                status: 201,
                contentType: "application/json",
                body: JSON.stringify({ message: "Subscription successful. Confirmation email sent." }),
            });
        });

        await page.locator("#email").fill(email);
        await page.locator("#repo").fill(TEST_REPO);
        await page.locator("#submit-button").click();

        const message = page.locator("#message");
        await expect(message).toHaveText(
            "Підписку створено. Перевірте email і підтвердьте її через посилання в листі.",
            { timeout: 15_000 },
        );
        await expect(message).toHaveClass(/message--success/);
        await expect(page.locator("#email")).toHaveValue("");
        await expect(page.locator("#repo")).toHaveValue("");
    });

    test("shows error for duplicate subscription", async ({ page }) => {
        const email = uniqueEmail();

        let attempts = 0;
        await page.route("**/api/subscribe", async (route) => {
            attempts += 1;

            if (attempts === 1) {
                await route.fulfill({
                    status: 201,
                    contentType: "application/json",
                    body: JSON.stringify({ message: "Subscription successful. Confirmation email sent." }),
                });
                return;
            }

            await route.fulfill({
                status: 409,
                contentType: "application/json",
                body: JSON.stringify({
                    code: "RESOURCE_CONFLICT",
                    message: "Email already subscribed to this repository",
                }),
            });
        });

        // First subscription
        await page.locator("#email").fill(email);
        await page.locator("#repo").fill(TEST_REPO);
        await page.locator("#submit-button").click();
        await expect(page.locator("#message")).toHaveClass(/message--success/, { timeout: 15_000 });

        // Second subscription, same email and repo
        await page.locator("#email").fill(email);
        await page.locator("#repo").fill(TEST_REPO);
        await page.locator("#submit-button").click();
        await expect(page.locator("#message")).toHaveText("Цей email вже підписаний на вказаний репозиторій.", {
            timeout: 10_000,
        });
        await expect(page.locator("#message")).toHaveClass(/message--error/);
    });

    test("shows error for non-existent GitHub repository", async ({ page }) => {
        await page.route("**/api/subscribe", async (route) => {
            await route.fulfill({
                status: 404,
                contentType: "application/json",
                body: JSON.stringify({ code: "NOT_FOUND", message: "Repository not found on GitHub" }),
            });
        });

        await page.locator("#email").fill(uniqueEmail());
        await page.locator("#repo").fill("definitely-fake-user-xyz/definitely-fake-repo-xyz");
        await page.locator("#submit-button").click();

        const message = page.locator("#message");
        await expect(message).toHaveText("Репозиторій не знайдено на GitHub.", { timeout: 15_000 });
        await expect(message).toHaveClass(/message--error/);
    });

    test("link to subscriptions page is visible and navigates correctly", async ({ page }) => {
        const link = page.locator("a", { hasText: "Переглянути підписки" });
        await expect(link).toBeVisible();

        await link.click();
        await expect(page).toHaveURL(/\/subscriptions/);
    });
});
