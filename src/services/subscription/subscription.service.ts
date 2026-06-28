import type { SubscriptionRecord, SubscriptionResponse } from "../../types/subscription.js";
import { generateToken } from "../../utils/crypto.js";
import { AppError } from "../../utils/errors.js";
import { PG_UNIQUE_VIOLATION } from "../../utils/pg-errors.js";
import { parseRepo, validateEmail } from "../../utils/validators.js";
import type { SubscriptionServiceDependencies } from "./subscription.types.js";

const ERR_ALREADY_SUBSCRIBED = "Email already subscribed to this repository";

export class SubscriptionService {
    constructor(private readonly deps: SubscriptionServiceDependencies) {}

    async subscribe(input: { email: string; repo: string }): Promise<void> {
        const email = validateEmail(input.email);
        const parsedRepo = parseRepo(input.repo);

        this.deps.logger.debug("Starting subscription flow", {
            email,
            repo: parsedRepo.fullName,
        });

        await this.deps.githubService.assertRepositoryExists(parsedRepo);

        const latestRelease = await this.deps.githubService.getLatestRelease(parsedRepo);
        const confirmToken = generateToken();
        const unsubscribeToken = generateToken();

        const record = await this.deps.transactionRunner(async (client) => {
            const existing = await this.deps.subscriptionRepository.findByEmailAndRepoForUpdate(
                client,
                email,
                parsedRepo.fullName,
            );

            if (existing?.unsubscribed_at === null) {
                this.deps.logger.warn("Duplicate subscription attempt", undefined, {
                    email,
                    repo: parsedRepo.fullName,
                });
                throw AppError.conflict(ERR_ALREADY_SUBSCRIBED);
            }

            const subscriptionRecord = await (
                existing
                    ? this.deps.subscriptionRepository.reactivate(client, {
                          id: existing.id,
                          confirmToken,
                          unsubscribeToken,
                          lastSeenTag: latestRelease?.tagName ?? null,
                      })
                    : this.deps.subscriptionRepository.create(client, {
                          email,
                          repoOwner: parsedRepo.owner,
                          repoName: parsedRepo.repo,
                          repoFullName: parsedRepo.fullName,
                          confirmToken,
                          unsubscribeToken,
                          lastSeenTag: latestRelease?.tagName ?? null,
                      })
            ).catch((error: unknown) => {
                if ((error as { code?: string }).code === PG_UNIQUE_VIOLATION) {
                    throw AppError.conflict(ERR_ALREADY_SUBSCRIBED);
                }
                throw error;
            });

            await this.deps.confirmationSaga.start(client, {
                subscriptionId: subscriptionRecord.id,
                email: subscriptionRecord.email,
                repo: subscriptionRecord.repo_full_name,
                confirmToken: subscriptionRecord.confirm_token,
                unsubscribeToken: subscriptionRecord.unsubscribe_token,
            });

            return subscriptionRecord;
        });

        this.deps.logger.info("Subscription created, confirmation email enqueued", {
            email: record.email,
            repo: record.repo_full_name,
        });
    }

    async confirm(token: string): Promise<void> {
        this.deps.tokenValidator.validate(token);

        const subscription = await this.deps.subscriptionRepository.findByConfirmToken(token);
        if (!subscription) {
            throw AppError.notFound("Token not found");
        }

        await this.deps.subscriptionRepository.confirmById(subscription.id);

        this.deps.logger.info("Subscription confirmed", {
            subscriptionId: subscription.id,
        });
    }

    async unsubscribe(token: string): Promise<void> {
        this.deps.tokenValidator.validate(token);

        const subscription = await this.deps.subscriptionRepository.findByUnsubscribeToken(token);
        if (!subscription) {
            throw AppError.notFound("Token not found");
        }

        await this.deps.subscriptionRepository.unsubscribeById(subscription.id);

        this.deps.logger.info("Subscription unsubscribed", {
            subscriptionId: subscription.id,
        });
    }

    async listByEmail(emailInput: string): Promise<SubscriptionResponse[]> {
        const email = validateEmail(emailInput);
        const rows: SubscriptionRecord[] = await this.deps.subscriptionRepository.listActiveByEmail(email);
        return this.deps.responseMapper.toResponseList(rows);
    }
}
