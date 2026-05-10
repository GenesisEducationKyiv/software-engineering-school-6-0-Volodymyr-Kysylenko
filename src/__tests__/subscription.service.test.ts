/* eslint-disable @typescript-eslint/require-await */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EmailServicePort } from "../services/email/email.types.js";
import type { GitHubServicePort } from "../services/github/github.types.js";
import { SubscriptionService } from "../services/subscription/subscription.service.js";
import type {
    SubscriptionRepositoryPort,
    SubscriptionResponseMapperPort,
    SubscriptionServiceDependencies,
    SubscriptionTokenValidatorPort,
} from "../services/subscription/subscription.types.js";
import type { SubscriptionRecord } from "../types/subscription.js";
import { AppError } from "../utils/errors.js";
import type { LoggerPort } from "../utils/logger/logger.types.js";

describe("SubscriptionService", () => {
    let service: SubscriptionService;
    let mockEmailService: EmailServicePort;
    let mockGithubService: GitHubServicePort;
    let mockRepository: SubscriptionRepositoryPort;
    let mockLogger: LoggerPort;
    let mockTokenValidator: SubscriptionTokenValidatorPort;
    let mockResponseMapper: SubscriptionResponseMapperPort;

    const mockSubscriptionRecord: SubscriptionRecord = {
        id: "sub-123",
        email: "user@example.com",
        repo_owner: "owner",
        repo_name: "repo",
        repo_full_name: "owner/repo",
        confirmed: false,
        confirm_token: "0123456789abcdef0123456789abcdef0123456789abcdef",
        unsubscribe_token: "fedcba9876543210fedcba9876543210fedcba9876543210",
        last_seen_tag: "v1.0.0",
        created_at: new Date("2023-01-01"),
        confirmed_at: null,
        unsubscribed_at: null,
    };

    beforeEach(() => {
        mockEmailService = {
            sendConfirmationEmail: vi.fn(async () => undefined),
            sendNewReleaseEmail: vi.fn(async () => undefined),
        };

        mockGithubService = {
            assertRepositoryExists: vi.fn(async () => undefined),
            getLatestRelease: vi.fn(async () => ({
                tagName: "v2.0.0",
                htmlUrl: "https://github.com/owner/repo/releases/tag/v2.0.0",
                name: "Release 2.0.0",
                publishedAt: "2023-01-02T00:00:00Z",
            })),
        };

        mockRepository = {
            create: vi.fn(async () => mockSubscriptionRecord),
            reactivate: vi.fn(async () => mockSubscriptionRecord),
            findByEmailAndRepo: vi.fn(async () => null),
            findByConfirmToken: vi.fn(async () => mockSubscriptionRecord),
            findByUnsubscribeToken: vi.fn(async () => mockSubscriptionRecord),
            confirmById: vi.fn(async () => undefined),
            unsubscribeById: vi.fn(async () => undefined),
            listActiveByEmail: vi.fn(async () => [mockSubscriptionRecord]),
        };

        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
        };

        mockTokenValidator = {
            validate: vi.fn((token: string) => {
                if (!token.trim()) {
                    throw AppError.validation("Invalid token");
                }
                if (!/^[0-9a-f]{48}$/.test(token)) {
                    throw AppError.validation("Invalid token format");
                }
            }),
        };

        mockResponseMapper = {
            toResponse: vi.fn((record: SubscriptionRecord) => ({
                email: record.email,
                repo: record.repo_full_name,
                confirmed: record.confirmed,
                last_seen_tag: record.last_seen_tag,
            })),

            toResponseList: vi.fn((records: SubscriptionRecord[]) =>
                records.map((record) => ({
                    email: record.email,
                    repo: record.repo_full_name,
                    confirmed: record.confirmed,
                    last_seen_tag: record.last_seen_tag,
                })),
            ),
        };

        const deps: SubscriptionServiceDependencies = {
            emailService: mockEmailService,
            githubService: mockGithubService,
            subscriptionRepository: mockRepository,
            tokenValidator: mockTokenValidator,
            responseMapper: mockResponseMapper,
            logger: mockLogger,
        };

        service = new SubscriptionService(deps);
    });

    describe("subscribe", () => {
        it("should create a new subscription with valid inputs", async () => {
            await service.subscribe({
                email: "user@example.com",
                repo: "owner/repo",
            });

            expect(mockGithubService.assertRepositoryExists).toHaveBeenCalledWith({
                owner: "owner",
                repo: "repo",
                fullName: "owner/repo",
            });

            expect(mockRepository.findByEmailAndRepo).toHaveBeenCalledWith("user@example.com", "owner/repo");

            expect(mockRepository.create).toHaveBeenCalled();
            expect(mockEmailService.sendConfirmationEmail).toHaveBeenCalled();
        });

        it("should reactivate an existing unsubscribed subscription", async () => {
            const existingRecord: SubscriptionRecord = {
                ...mockSubscriptionRecord,
                unsubscribed_at: new Date("2023-06-01"),
            };

            vi.mocked(mockRepository.findByEmailAndRepo).mockResolvedValueOnce(existingRecord);

            await service.subscribe({
                email: "user@example.com",
                repo: "owner/repo",
            });

            expect(mockRepository.reactivate).toHaveBeenCalled();
            expect(mockRepository.create).not.toHaveBeenCalled();
        });

        it("should throw conflict error if already subscribed", async () => {
            vi.mocked(mockRepository.findByEmailAndRepo).mockResolvedValueOnce(mockSubscriptionRecord);

            await expect(
                service.subscribe({
                    email: "user@example.com",
                    repo: "owner/repo",
                }),
            ).rejects.toThrow("Email already subscribed to this repository");
        });

        it("should throw error if repository does not exist", async () => {
            vi.mocked(mockGithubService.assertRepositoryExists).mockRejectedValueOnce(
                AppError.notFound("Repository not found"),
            );

            await expect(
                service.subscribe({
                    email: "user@example.com",
                    repo: "owner/repo",
                }),
            ).rejects.toThrow("Repository not found");
        });

        it("should throw validation error for invalid email", async () => {
            await expect(
                service.subscribe({
                    email: "invalid-email",
                    repo: "owner/repo",
                }),
            ).rejects.toThrow("Invalid email");
        });

        it("should throw validation error for invalid repo format", async () => {
            await expect(
                service.subscribe({
                    email: "user@example.com",
                    repo: "invalid-repo-format",
                }),
            ).rejects.toThrow("Invalid repo");
        });
    });

    describe("confirm", () => {
        it("should confirm a subscription with valid token", async () => {
            await service.confirm("0123456789abcdef0123456789abcdef0123456789abcdef");

            expect(mockRepository.findByConfirmToken).toHaveBeenCalledWith(
                "0123456789abcdef0123456789abcdef0123456789abcdef",
            );
            expect(mockRepository.confirmById).toHaveBeenCalledWith("sub-123");
        });

        it("should throw error if token not found", async () => {
            vi.mocked(mockRepository.findByConfirmToken).mockResolvedValueOnce(null);

            await expect(service.confirm("0123456789abcdef0123456789abcdef0123456789abcdef")).rejects.toThrow(
                "Token not found",
            );
        });

        it("should throw validation error for empty token", async () => {
            await expect(service.confirm("")).rejects.toThrow("Invalid token");
        });

        it("should throw validation error for invalid token format", async () => {
            await expect(service.confirm("invalid-format")).rejects.toThrow("Invalid token format");
        });
    });

    describe("unsubscribe", () => {
        it("should unsubscribe with valid token", async () => {
            await service.unsubscribe("fedcba9876543210fedcba9876543210fedcba9876543210");

            expect(mockRepository.findByUnsubscribeToken).toHaveBeenCalledWith(
                "fedcba9876543210fedcba9876543210fedcba9876543210",
            );
            expect(mockRepository.unsubscribeById).toHaveBeenCalledWith("sub-123");
        });

        it("should throw error if token not found", async () => {
            vi.mocked(mockRepository.findByUnsubscribeToken).mockResolvedValueOnce(null);

            await expect(service.unsubscribe("fedcba9876543210fedcba9876543210fedcba9876543210")).rejects.toThrow(
                "Token not found",
            );
        });

        it("should throw validation error for empty token", async () => {
            await expect(service.unsubscribe("")).rejects.toThrow("Invalid token");
        });

        it("should throw validation error for invalid token format", async () => {
            await expect(service.unsubscribe("invalid-format")).rejects.toThrow("Invalid token format");
        });
    });

    describe("listByEmail", () => {
        it("should list active subscriptions for email", async () => {
            const result = await service.listByEmail("user@example.com");

            expect(mockRepository.listActiveByEmail).toHaveBeenCalledWith("user@example.com");
            expect(result).toEqual([
                {
                    email: "user@example.com",
                    repo: "owner/repo",
                    confirmed: false,
                    last_seen_tag: "v1.0.0",
                },
            ]);
        });

        it("should throw validation error for invalid email", async () => {
            await expect(service.listByEmail("invalid-email")).rejects.toThrow("Invalid email");
        });

        it("should return empty list when no subscriptions found", async () => {
            vi.mocked(mockRepository.listActiveByEmail).mockResolvedValueOnce([]);

            const result = await service.listByEmail("user@example.com");

            expect(result).toEqual([]);
        });

        it("should map multiple subscriptions correctly", async () => {
            const secondRecord: SubscriptionRecord = {
                ...mockSubscriptionRecord,
                id: "sub-456",
                repo_full_name: "owner2/repo2",
                repo_name: "repo2",
                repo_owner: "owner2",
            };

            vi.mocked(mockRepository.listActiveByEmail).mockResolvedValueOnce([mockSubscriptionRecord, secondRecord]);

            const result = await service.listByEmail("user@example.com");

            expect(result).toHaveLength(2);
            expect(result[0]?.repo).toBe("owner/repo");
            expect(result[1]?.repo).toBe("owner2/repo2");
        });
    });
});
