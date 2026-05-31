import type promClient from "prom-client";

export interface PrometheusRecorderDependencies {
    activeSubscriptions: promClient.Gauge;
    githubApiCalls: promClient.Counter<string>;
    emailsSent: promClient.Counter<string>;
    scannerRuns: promClient.Counter<string>;
}

export class PrometheusRecorder {
    constructor(private readonly metrics: PrometheusRecorderDependencies) {}

    recordGithubApiCall(status: "success" | "error", type: "releases" | "rate_limit" | "other" = "other"): void {
        this.metrics.githubApiCalls.inc({ status, type });
    }

    recordEmailSent(status: "success" | "error"): void {
        this.metrics.emailsSent.inc({ status });
    }

    recordScannerRun(status: "success" | "error"): void {
        this.metrics.scannerRuns.inc({ status });
    }

    updateActiveSubscriptions(count: number): void {
        this.metrics.activeSubscriptions.set(count);
    }
}
