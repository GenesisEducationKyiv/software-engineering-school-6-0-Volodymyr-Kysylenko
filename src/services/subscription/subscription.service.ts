import type { SubscriptionRecord, SubscriptionResponse } from "../../types/subscription.js";
import { generateToken } from "../../utils/crypto.js";
import { AppError } from "../../utils/errors.js";
import { parseRepo, validateEmail } from "../../utils/validators.js";
import type { SubscriptionServiceDependencies } from "./subscription.types.js";

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

        const existing = await this.deps.subscriptionRepository.findByEmailAndRepo(email, parsedRepo.fullName);
        if (existing?.unsubscribed_at === null) {
            this.deps.logger.warn("Duplicate subscription attempt", undefined, {
                email,
                repo: parsedRepo.fullName,
            });
            throw AppError.conflict("Email already subscribed to this repository");
        }

        const latestRelease = await this.deps.githubService.getLatestRelease(parsedRepo);
        const confirmToken = generateToken();
        const unsubscribeToken = generateToken();

        const record = existing
            ? await this.deps.subscriptionRepository.reactivate({
                  id: existing.id,
                  confirmToken,
                  unsubscribeToken,
                  lastSeenTag: latestRelease?.tagName ?? null,
              })
            : await this.deps.subscriptionRepository.create({
                  email,
                  repoOwner: parsedRepo.owner,
                  repoName: parsedRepo.repo,
                  repoFullName: parsedRepo.fullName,
                  confirmToken,
                  unsubscribeToken,
                  lastSeenTag: latestRelease?.tagName ?? null,
              });

        await this.deps.emailService.sendConfirmationEmail({
            to: record.email,
            repo: record.repo_full_name,
            confirmToken: record.confirm_token,
            unsubscribeToken: record.unsubscribe_token,
        });

        this.deps.logger.info("Subscription confirmation email sent", {
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
