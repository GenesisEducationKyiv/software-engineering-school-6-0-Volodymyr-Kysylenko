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

    recordGithubApiCall(status: "success" | "error", type: "releases" | "rate_limit" | "other"): void {
        this.recorder.recordGithubApiCall(status, type);
    }

    recordGithubApiDuration(type: "releases" | "rate_limit" | "other", durationSeconds: number): void {
        this.recorder.recordGithubApiDuration(type, durationSeconds);
    }

    recordEmailSent(status: "success" | "error"): void {
        this.recorder.recordEmailSent(status);
    }

    recordEmailDuration(type: "confirmation" | "release", durationSeconds: number): void {
        this.recorder.recordEmailDuration(type, durationSeconds);
    }

    recordScannerRun(status: "success" | "error"): void {
        this.recorder.recordScannerRun(status);
    }

    recordScannerRunDuration(durationSeconds: number): void {
        this.recorder.recordScannerRunDuration(durationSeconds);
    }

    updateActiveSubscriptions(count: number): void {
        this.recorder.updateActiveSubscriptions(count);
    }

    recordHttpRequest(method: string, route: string, statusCode: string, durationSeconds: number): void {
        this.recorder.recordHttpRequest(method, route, statusCode, durationSeconds);
    }

    incrementHttpInFlight(method: string): void {
        this.recorder.incrementHttpInFlight(method);
    }

    decrementHttpInFlight(method: string): void {
        this.recorder.decrementHttpInFlight(method);
    }

    async initializeMetrics(): Promise<void> {
        await this.initializer.initialize();
    }

    async getMetrics(): Promise<string> {
        return this.metricsContent.metrics();
    }
}
