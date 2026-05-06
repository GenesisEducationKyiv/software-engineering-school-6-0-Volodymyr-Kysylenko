import promClient from "prom-client";

import { subscriptionRepository } from "../repositories/subscription.repository.js";
import { logger } from "../utils/logger.js";

class MetricsService {
    private readonly registry: promClient.Registry;
    private readonly activeSubscriptions: promClient.Gauge;
    private readonly githubApiCalls: promClient.Counter<string>;
    private readonly emailsSent: promClient.Counter<string>;
    private readonly scannerRuns: promClient.Counter<string>;

    constructor() {
        this.registry = new promClient.Registry();

        promClient.collectDefaultMetrics({
            register: this.registry,
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
        });

        this.activeSubscriptions = new promClient.Gauge({
            name: "github_notifier_active_subscriptions",
            help: "Number of active GitHub repository subscriptions",
            registers: [this.registry],
        });

        this.githubApiCalls = new promClient.Counter({
            name: "github_notifier_api_calls_total",
            help: "Total number of GitHub API calls",
            labelNames: ["status", "type"],
            registers: [this.registry],
        });

        this.emailsSent = new promClient.Counter({
            name: "github_notifier_emails_sent_total",
            help: "Total number of notification emails sent",
            labelNames: ["status"],
            registers: [this.registry],
        });

        this.scannerRuns = new promClient.Counter({
            name: "github_notifier_scanner_runs_total",
            help: "Total number of scanner runs",
            labelNames: ["status"],
            registers: [this.registry],
        });
    }

    recordGithubApiCall(status: "success" | "error", type: "releases" | "rate_limit" | "other" = "other") {
        this.githubApiCalls.inc({ status, type });
    }

    recordEmailSent(status: "success" | "error") {
        this.emailsSent.inc({ status });
    }

    recordScannerRun(status: "success" | "error") {
        this.scannerRuns.inc({ status });
    }

    updateActiveSubscriptions(count: number) {
        this.activeSubscriptions.set(count);
    }

    async initializeMetrics(): Promise<void> {
        try {
            const activeSubscriptionsCount = await subscriptionRepository.countActiveSubscriptions();
            this.updateActiveSubscriptions(activeSubscriptionsCount);
            logger.info(`Metrics initialized with ${activeSubscriptionsCount} active subscriptions`);
        } catch (error) {
            logger.warn("Failed to initialize metrics", { error });
        }
    }

    async getMetrics(): Promise<string> {
        return this.registry.metrics();
    }
}

export const metricsService = new MetricsService();
