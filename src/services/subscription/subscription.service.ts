import { subscriptionRepository } from "../../repositories/subscription.repository.js";
import type { SubscriptionResponse } from "../../types/subscription.js";
import { generateToken } from "../../utils/crypto.js";
import { AppError } from "../../utils/errors.js";
import { parseRepo, validateEmail } from "../../utils/validators.js";
import { emailService } from "../email/email.service.js";
import { githubService } from "../github/github.service.js";

export class SubscriptionService {
    private validateToken(token: string): void {
        if (!token.trim()) {
            throw AppError.validation("Invalid token");
        }

        // not necessary but make 400 instead of 404 for obviously invalid tokens
        if (!/^[0-9a-f]{48}$/.test(token)) {
            throw AppError.validation("Invalid token format");
        }
    }
    private toResponse(row: {
        email: string;
        repo_full_name: string;
        confirmed: boolean;
        last_seen_tag: string | null;
    }): SubscriptionResponse {
        return {
            email: row.email,
            repo: row.repo_full_name,
            confirmed: row.confirmed,
            last_seen_tag: row.last_seen_tag,
        };
    }

    async subscribe(input: { email: string; repo: string }): Promise<void> {
        const email = validateEmail(input.email);
        const parsedRepo = parseRepo(input.repo);

        await githubService.assertRepositoryExists(parsedRepo);

        const existing = await subscriptionRepository.findByEmailAndRepo(email, parsedRepo.fullName);
        if (existing?.unsubscribed_at === null) {
            throw AppError.conflict("Email already subscribed to this repository");
        }

        const latestRelease = await githubService.getLatestRelease(parsedRepo);
        const confirmToken = generateToken();
        const unsubscribeToken = generateToken();

        const record = existing
            ? await subscriptionRepository.reactivate({
                  id: existing.id,
                  confirmToken,
                  unsubscribeToken,
                  lastSeenTag: latestRelease?.tagName ?? null,
              })
            : await subscriptionRepository.create({
                  email,
                  repoOwner: parsedRepo.owner,
                  repoName: parsedRepo.repo,
                  repoFullName: parsedRepo.fullName,
                  confirmToken,
                  unsubscribeToken,
                  lastSeenTag: latestRelease?.tagName ?? null,
              });

        await emailService.sendConfirmationEmail({
            to: record.email,
            repo: record.repo_full_name,
            confirmToken: record.confirm_token,
            unsubscribeToken: record.unsubscribe_token,
        });
    }

    async confirm(token: string): Promise<void> {
        this.validateToken(token);

        const subscription = await subscriptionRepository.findByConfirmToken(token);
        if (!subscription) {
            throw AppError.notFound("Token not found");
        }

        await subscriptionRepository.confirmById(subscription.id);
    }

    async unsubscribe(token: string): Promise<void> {
        this.validateToken(token);

        const subscription = await subscriptionRepository.findByUnsubscribeToken(token);
        if (!subscription) {
            throw AppError.notFound("Token not found");
        }

        await subscriptionRepository.unsubscribeById(subscription.id);
    }

    async listByEmail(emailInput: string): Promise<SubscriptionResponse[]> {
        const email = validateEmail(emailInput);
        const rows = await subscriptionRepository.listActiveByEmail(email);
        return rows.map((row) => this.toResponse(row));
    }
}

export const subscriptionService = new SubscriptionService();
