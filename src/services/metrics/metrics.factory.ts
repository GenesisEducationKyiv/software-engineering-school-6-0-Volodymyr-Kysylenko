import promClient from "prom-client";

export interface PrometheusMetricsSet {
    registry: promClient.Registry;
    activeSubscriptions: promClient.Gauge;
    githubApiCalls: promClient.Counter<string>;
    emailsSent: promClient.Counter<string>;
    scannerRuns: promClient.Counter<string>;
}

export class MetricsFactory {
    createMetrics(): PrometheusMetricsSet {
        const registry = new promClient.Registry();

        promClient.collectDefaultMetrics({
            register: registry,
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
        });

        const activeSubscriptions = new promClient.Gauge({
            name: "github_notifier_active_subscriptions",
            help: "Number of active GitHub repository subscriptions",
            registers: [registry],
        });

        const githubApiCalls = new promClient.Counter({
            name: "github_notifier_api_calls_total",
            help: "Total number of GitHub API calls",
            labelNames: ["status", "type"],
            registers: [registry],
        });

        const emailsSent = new promClient.Counter({
            name: "github_notifier_emails_sent_total",
            help: "Total number of notification emails sent",
            labelNames: ["status"],
            registers: [registry],
        });

        const scannerRuns = new promClient.Counter({
            name: "github_notifier_scanner_runs_total",
            help: "Total number of scanner runs",
            labelNames: ["status"],
            registers: [registry],
        });

        return {
            registry,
            activeSubscriptions,
            githubApiCalls,
            emailsSent,
            scannerRuns,
        };
    }
}
