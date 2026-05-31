import promClient from "prom-client";

import type { GithubApiCallType, OperationStatus, PrometheusMetricsSet } from "./metrics.types.js";

const OPERATION_STATUSES: OperationStatus[] = ["success", "error"];
const GITHUB_API_CALL_TYPES: GithubApiCallType[] = ["releases", "rate_limit", "other"];

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

        const githubApiCallDuration = new promClient.Histogram({
            name: "github_notifier_api_call_duration_seconds",
            help: "Duration of GitHub API calls in seconds",
            labelNames: ["type"],
            buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
            registers: [registry],
        });

        const emailsSent = new promClient.Counter({
            name: "github_notifier_emails_sent_total",
            help: "Total number of notification emails sent",
            labelNames: ["status"],
            registers: [registry],
        });

        const emailDuration = new promClient.Histogram({
            name: "github_notifier_email_duration_seconds",
            help: "Duration of email send operations in seconds",
            labelNames: ["type"],
            buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
            registers: [registry],
        });

        const scannerRuns = new promClient.Counter({
            name: "github_notifier_scanner_runs_total",
            help: "Total number of scanner runs",
            labelNames: ["status"],
            registers: [registry],
        });

        const scannerRunDuration = new promClient.Histogram({
            name: "github_notifier_scanner_run_duration_seconds",
            help: "Duration of full scanner run cycles in seconds",
            buckets: [0.5, 1, 2, 5, 10, 30, 60, 120],
            registers: [registry],
        });

        const httpRequestsTotal = new promClient.Counter({
            name: "http_requests_total",
            help: "Total number of HTTP requests",
            labelNames: ["method", "route", "status_code"],
            registers: [registry],
        });

        const httpRequestDuration = new promClient.Histogram({
            name: "http_request_duration_seconds",
            help: "Duration of HTTP requests in seconds",
            labelNames: ["method", "route", "status_code"],
            buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
            registers: [registry],
        });

        const httpRequestsInFlight = new promClient.Gauge({
            name: "http_requests_in_flight",
            help: "Number of HTTP requests currently being processed",
            labelNames: ["method"],
            registers: [registry],
        });

        for (const status of OPERATION_STATUSES) {
            for (const type of GITHUB_API_CALL_TYPES) {
                githubApiCalls.inc({ status, type }, 0);
            }
            emailsSent.inc({ status }, 0);
            scannerRuns.inc({ status }, 0);
        }

        return {
            registry,
            activeSubscriptions,
            githubApiCalls,
            githubApiCallDuration,
            emailsSent,
            emailDuration,
            scannerRuns,
            scannerRunDuration,
            httpRequestsTotal,
            httpRequestDuration,
            httpRequestsInFlight,
        };
    }
}

export function createMetrics(): PrometheusMetricsSet {
    return new MetricsFactory().createMetrics();
}
