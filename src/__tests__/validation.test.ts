import { describe, it, expect } from "vitest";
import { z } from "zod";
import { CreateSubscriptionDto, TokenParamsDto, ListSubscriptionsDto } from "../dto/subscription.dto.js";

describe("DTO Validation", () => {
    describe("CreateSubscriptionDto", () => {
        it("validates correct subscription data", () => {
            const validData = {
                email: "test@example.com",
                repo: "user/repo-name",
            };

            const result = CreateSubscriptionDto.parse(validData);

            expect(result).toEqual(validData);
        });

        it("rejects invalid email format", () => {
            const invalidData = {
                email: "invalid-email",
                repo: "user/repo",
            };

            expect(() => CreateSubscriptionDto.parse(invalidData)).toThrow(z.ZodError);
        });

        it("rejects invalid repo format", () => {
            const invalidData = {
                email: "test@example.com",
                repo: "invalid/repo/format",
            };

            expect(() => CreateSubscriptionDto.parse(invalidData)).toThrow(z.ZodError);
        });

        it("provides detailed validation errors", () => {
            const invalidData = {
                email: "invalid-email",
                repo: "invalid/repo/format",
            };

            try {
                CreateSubscriptionDto.parse(invalidData);
            } catch (error) {
                expect(error).toBeInstanceOf(z.ZodError);
                if (error instanceof z.ZodError) {
                    const emailError = error.errors.find((e) => e.path[0] === "email");
                    const repoError = error.errors.find((e) => e.path[0] === "repo");

                    expect(emailError).toBeDefined();
                    expect(repoError).toBeDefined();
                }
            }
        });
    });

    describe("TokenParamsDto", () => {
        it("validates valid token", () => {
            const validToken = { token: "abc123" };

            const result = TokenParamsDto.parse(validToken);

            expect(result).toEqual(validToken);
        });

        it("rejects empty token", () => {
            const invalidToken = { token: "" };

            expect(() => TokenParamsDto.parse(invalidToken)).toThrow(z.ZodError);
        });
    });

    describe("ListSubscriptionsDto", () => {
        it("validates valid email query", () => {
            const validQuery = { email: "user@example.com" };

            const result = ListSubscriptionsDto.parse(validQuery);

            expect(result).toEqual(validQuery);
        });

        it("rejects invalid email in query", () => {
            const invalidQuery = { email: "invalid-email" };

            expect(() => ListSubscriptionsDto.parse(invalidQuery)).toThrow(z.ZodError);
        });
    });
});
