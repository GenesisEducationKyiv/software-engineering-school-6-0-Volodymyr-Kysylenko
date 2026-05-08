import * as grpc from "@grpc/grpc-js";
import { describe, expect, it } from "vitest";

import { CreateSubscriptionDto, ListSubscriptionsDto, TokenParamsDto } from "../dto/subscription.dto.js";
import { mapHttpToGrpcStatus, validateGrpcRequest } from "../grpc/validation.utils.js";

describe("gRPC Validation Utils", () => {
    describe("validateGrpcRequest", () => {
        describe("CreateSubscriptionDto", () => {
            it("validates correct subscription data", () => {
                const validData = {
                    email: "test@example.com",
                    repo: "user/repo-name",
                };

                const result = validateGrpcRequest(validData, CreateSubscriptionDto);

                expect(result.success).toBe(true);

                if (!result.success) {
                    throw new Error("Expected success");
                }

                expect(result.data).toEqual(validData);
            });

            it("rejects invalid email format", () => {
                const invalidData = {
                    email: "invalid-email",
                    repo: "user/repo",
                };

                const result = validateGrpcRequest(invalidData, CreateSubscriptionDto);

                expect(result.success).toBe(false);

                if (result.success) {
                    throw new Error("Expected failure");
                }

                expect(result.error).toEqual({
                    code: grpc.status.INVALID_ARGUMENT,
                    details: expect.stringContaining("email"),
                });
            });

            it("rejects invalid repo format", () => {
                const invalidData = {
                    email: "test@example.com",
                    repo: "invalid/repo/format",
                };

                const result = validateGrpcRequest(invalidData, CreateSubscriptionDto);

                expect(result.success).toBe(false);

                if (result.success) {
                    throw new Error("Expected failure");
                }

                expect(result.error.code).toBe(grpc.status.INVALID_ARGUMENT);
                expect(result.error.details).toContain("Invalid repo format");
            });

            it("provides detailed validation errors", () => {
                const invalidData = {
                    email: "invalid-email",
                    repo: "invalid/repo/format",
                };

                const result = validateGrpcRequest(invalidData, CreateSubscriptionDto);

                expect(result.success).toBe(false);

                if (result.success) {
                    throw new Error("Expected failure");
                }

                expect(result.error.details).toContain("email");
                expect(result.error.details).toContain("repo");
            });
        });

        describe("TokenParamsDto", () => {
            it("validates valid token", () => {
                const validData = { token: "abc123" };

                const result = validateGrpcRequest(validData, TokenParamsDto);

                expect(result.success).toBe(true);

                if (!result.success) {
                    throw new Error("Expected success");
                }

                expect(result.data).toEqual(validData);
            });

            it("rejects empty token", () => {
                const invalidData = { token: "" };

                const result = validateGrpcRequest(invalidData, TokenParamsDto);

                expect(result.success).toBe(false);

                if (result.success) {
                    throw new Error("Expected failure");
                }

                expect(result.error.code).toBe(grpc.status.INVALID_ARGUMENT);
            });
        });

        describe("ListSubscriptionsDto", () => {
            it("validates valid email query", () => {
                const validData = { email: "user@example.com" };

                const result = validateGrpcRequest(validData, ListSubscriptionsDto);

                expect(result.success).toBe(true);

                if (!result.success) {
                    throw new Error("Expected success");
                }

                expect(result.data).toEqual(validData);
            });

            it("rejects invalid email", () => {
                const invalidData = { email: "invalid-email" };

                const result = validateGrpcRequest(invalidData, ListSubscriptionsDto);

                expect(result.success).toBe(false);

                if (result.success) {
                    throw new Error("Expected failure");
                }

                expect(result.error.code).toBe(grpc.status.INVALID_ARGUMENT);
            });
        });
    });

    describe("mapHttpToGrpcStatus", () => {
        it("maps HTTP 400 to INVALID_ARGUMENT", () => {
            expect(mapHttpToGrpcStatus(400)).toBe(grpc.status.INVALID_ARGUMENT);
        });

        it("maps HTTP 404 to NOT_FOUND", () => {
            expect(mapHttpToGrpcStatus(404)).toBe(grpc.status.NOT_FOUND);
        });

        it("maps HTTP 409 to ALREADY_EXISTS", () => {
            expect(mapHttpToGrpcStatus(409)).toBe(grpc.status.ALREADY_EXISTS);
        });

        it("maps HTTP 429 to RESOURCE_EXHAUSTED", () => {
            expect(mapHttpToGrpcStatus(429)).toBe(grpc.status.RESOURCE_EXHAUSTED);
        });

        it("maps HTTP 500 to INTERNAL", () => {
            expect(mapHttpToGrpcStatus(500)).toBe(grpc.status.INTERNAL);
        });

        it("maps unknown status codes to INTERNAL", () => {
            expect(mapHttpToGrpcStatus(418)).toBe(grpc.status.INTERNAL);
            expect(mapHttpToGrpcStatus(999)).toBe(grpc.status.INTERNAL);
        });
    });
});
