import type { EmailSendType, GithubApiCallType, OperationStatus, PrometheusMetricsSet } from "./metrics.types.js";

// The recorder only needs the metrics objects — not the registry (used by MetricsService).
type Deps = Omit<PrometheusMetricsSet, "registry">;

export class PrometheusRecorder {
    constructor(private readonly metrics: Deps) {}

    recordGithubApiCall(status: OperationStatus, type: GithubApiCallType): void {
        this.metrics.githubApiCalls.inc({ status, type });
    }

    recordGithubApiDuration(type: GithubApiCallType, durationSeconds: number): void {
        this.metrics.githubApiCallDuration.observe({ type }, durationSeconds);
    }

    recordEmailSent(status: OperationStatus): void {
        this.metrics.emailsSent.inc({ status });
    }

    recordEmailDuration(type: EmailSendType, durationSeconds: number): void {
        this.metrics.emailDuration.observe({ type }, durationSeconds);
    }

    recordScannerRun(status: OperationStatus): void {
        this.metrics.scannerRuns.inc({ status });
    }

    recordScannerRunDuration(durationSeconds: number): void {
        this.metrics.scannerRunDuration.observe(durationSeconds);
    }

    updateActiveSubscriptions(count: number): void {
        this.metrics.activeSubscriptions.set(count);
    }

    recordHttpRequest(method: string, route: string, statusCode: string, durationSeconds: number): void {
        this.metrics.httpRequestsTotal.inc({ method, route, status_code: statusCode });
        this.metrics.httpRequestDuration.observe({ method, route, status_code: statusCode }, durationSeconds);
    }

    incrementHttpInFlight(method: string): void {
        this.metrics.httpRequestsInFlight.inc({ method });
    }

    decrementHttpInFlight(method: string): void {
        this.metrics.httpRequestsInFlight.dec({ method });
    }
}
