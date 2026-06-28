import type {
    MetricsContentPort,
    MetricsInitializerPort,
    MetricsRecorderPort,
    MetricsServicePort,
} from "./metrics.types.js";

export class MetricsService implements MetricsServicePort {
    constructor(
        private readonly metricsContent: MetricsContentPort,
        private readonly recorder: MetricsRecorderPort,
        private readonly initializer: MetricsInitializerPort,
    ) {}

    recordGithubApiCall(status: "success" | "error", type: "releases" | "rate_limit" | "other" = "other"): void {
        this.recorder.recordGithubApiCall(status, type);
    }

    recordEmailSent(status: "success" | "error"): void {
        this.recorder.recordEmailSent(status);
    }

    recordScannerRun(status: "success" | "error"): void {
        this.recorder.recordScannerRun(status);
    }

    updateActiveSubscriptions(count: number): void {
        this.recorder.updateActiveSubscriptions(count);
    }

    async initializeMetrics(): Promise<void> {
        await this.initializer.initialize();
    }

    async getMetrics(): Promise<string> {
        return this.metricsContent.metrics();
    }
}
