import type { PrometheusMetricsSet } from "./metrics.factory.js";
import type { MetricsInitializer } from "./metrics.initializer.js";
import type { MetricsServicePort } from "./metrics.types.js";
import type { PrometheusRecorder } from "./prometheus.recorder.js";

export class MetricsService implements MetricsServicePort {
    private readonly metricsSet: PrometheusMetricsSet;
    private readonly recorder: PrometheusRecorder;
    private readonly initializer: MetricsInitializer;

    constructor(metricsSet: PrometheusMetricsSet, recorder: PrometheusRecorder, initializer: MetricsInitializer) {
        this.metricsSet = metricsSet;
        this.recorder = recorder;
        this.initializer = initializer;
    }

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
        return this.metricsSet.registry.metrics();
    }

    getRegistry(): unknown {
        return this.metricsSet.registry;
    }
}
