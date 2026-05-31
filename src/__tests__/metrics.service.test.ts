import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMetrics } from "../services/metrics/metrics.factory.js";
import { MetricsInitializer } from "../services/metrics/metrics.initializer.js";
import { MetricsService } from "../services/metrics/metrics.service.js";
import { PrometheusRecorder } from "../services/metrics/prometheus.recorder.js";
import { metricsService } from "../services/services.module.js";

function createIsolatedService(): MetricsService {
    const set = createMetrics();
    const { registry, ...recordableMetrics } = set;
    const recorder = new PrometheusRecorder(recordableMetrics);
    const initializer = new MetricsInitializer(
        recorder,
        { countActiveSubscriptions: vi.fn().mockResolvedValue(0) },
        { info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined },
    );
    return new MetricsService({ metrics: async () => registry.metrics() }, recorder, initializer);
}

describe("Prometheus Metrics - Simplified", () => {
    it("should generate business metrics in Prometheus format", async () => {
        metricsService.recordEmailSent("success");
        metricsService.recordGithubApiCall("success", "releases");
        metricsService.recordScannerRun("success");
        metricsService.updateActiveSubscriptions(5);

        const metrics = await metricsService.getMetrics();

        expect(metrics).toContain("github_notifier_emails_sent_total");
        expect(metrics).toContain("github_notifier_api_calls_total");
        expect(metrics).toContain("github_notifier_scanner_runs_total");
        expect(metrics).toContain("github_notifier_active_subscriptions");

        expect(metrics).toContain("process_cpu_user_seconds_total");
        expect(metrics).toContain("nodejs_heap_size_total_bytes");

        expect(metrics).toMatch(/github_notifier_emails_sent_total{.*status="success".*}\s+\d+/);
        expect(metrics).toMatch(/github_notifier_api_calls_total{.*status="success".*type="releases".*}\s+\d+/);
        expect(metrics).toMatch(/github_notifier_active_subscriptions\s+5/);
    });

    it("should record GitHub API calls with different types", async () => {
        metricsService.recordGithubApiCall("success", "releases");
        metricsService.recordGithubApiCall("error", "rate_limit");
        metricsService.recordGithubApiCall("success", "other");

        const metrics = await metricsService.getMetrics();
        expect(metrics).toContain('type="releases"');
        expect(metrics).toContain('type="rate_limit"');
        expect(metrics).toContain('type="other"');
    });

    it("should record scanner runs", async () => {
        metricsService.recordScannerRun("success");
        metricsService.recordScannerRun("error");

        const metrics = await metricsService.getMetrics();
        expect(metrics).toContain("github_notifier_scanner_runs_total");
        expect(metrics).toContain('status="success"');
        expect(metrics).toContain('status="error"');
    });
});

describe("RED Metrics — Duration histograms", () => {
    let svc: MetricsService;

    beforeEach(() => {
        svc = createIsolatedService();
    });

    it("registers all duration histogram metric names", async () => {
        const metrics = await svc.getMetrics();
        expect(metrics).toContain("github_notifier_api_call_duration_seconds");
        expect(metrics).toContain("github_notifier_email_duration_seconds");
        expect(metrics).toContain("github_notifier_scanner_run_duration_seconds");
    });

    it("records GitHub API call duration and emits _bucket / _sum / _count lines", async () => {
        svc.recordGithubApiDuration("releases", 0.3);
        svc.recordGithubApiDuration("other", 1.2);

        const metrics = await svc.getMetrics();
        expect(metrics).toContain('le="0.05",type="releases"');
        expect(metrics).toContain('github_notifier_api_call_duration_seconds_sum{type="releases"}');
        expect(metrics).toMatch(/github_notifier_api_call_duration_seconds_count\{type="releases"\}\s+1/);
        expect(metrics).toMatch(/github_notifier_api_call_duration_seconds_count\{type="other"\}\s+1/);
    });

    it("places GitHub API duration value in the correct bucket", async () => {
        svc.recordGithubApiDuration("releases", 0.4);

        const metrics = await svc.getMetrics();
        expect(metrics).toMatch(/github_notifier_api_call_duration_seconds_bucket\{le="0\.5",type="releases"\}\s+1/);
        expect(metrics).toMatch(/github_notifier_api_call_duration_seconds_bucket\{le="0\.25",type="releases"\}\s+0/);
    });

    it("records email send duration with confirmation and release types", async () => {
        svc.recordEmailDuration("confirmation", 0.15);
        svc.recordEmailDuration("release", 0.8);

        const metrics = await svc.getMetrics();
        expect(metrics).toContain('le="0.05",type="confirmation"');
        expect(metrics).toContain('le="0.05",type="release"');
        expect(metrics).toMatch(/github_notifier_email_duration_seconds_count\{type="confirmation"\}\s+1/);
        expect(metrics).toMatch(/github_notifier_email_duration_seconds_count\{type="release"\}\s+1/);
    });

    it("records scanner run duration without label dimensions", async () => {
        svc.recordScannerRunDuration(5.5);

        const metrics = await svc.getMetrics();
        expect(metrics).toMatch(/github_notifier_scanner_run_duration_seconds_bucket\{le="10"\}\s+1/);
        expect(metrics).toMatch(/github_notifier_scanner_run_duration_seconds_bucket\{le="5"\}\s+0/);
        expect(metrics).toMatch(/github_notifier_scanner_run_duration_seconds_count\s+1/);
    });
});

describe("RED Metrics — HTTP counter and histogram", () => {
    let svc: MetricsService;

    beforeEach(() => {
        svc = createIsolatedService();
    });

    it("registers all HTTP metric names", async () => {
        const metrics = await svc.getMetrics();
        expect(metrics).toContain("http_requests_total");
        expect(metrics).toContain("http_request_duration_seconds");
        expect(metrics).toContain("http_requests_in_flight");
    });

    it("records HTTP request with method, route and status_code labels", async () => {
        svc.recordHttpRequest("GET", "/api/metrics", "200", 0.012);
        svc.recordHttpRequest("POST", "/api/subscribe", "201", 0.05);
        svc.recordHttpRequest("GET", "/api/subscribe", "400", 0.008);

        const metrics = await svc.getMetrics();
        expect(metrics).toContain('method="GET",route="/api/metrics",status_code="200"');
        expect(metrics).toContain('method="POST",route="/api/subscribe",status_code="201"');
        expect(metrics).toContain('method="GET",route="/api/subscribe",status_code="400"');
    });

    it("increments http_requests_total counter per call", async () => {
        svc.recordHttpRequest("GET", "/api/health", "200", 0.01);
        svc.recordHttpRequest("GET", "/api/health", "200", 0.02);

        const metrics = await svc.getMetrics();
        expect(metrics).toMatch(/http_requests_total\{method="GET",route="\/api\/health",status_code="200"\}\s+2/);
    });

    it("places HTTP duration value in the correct bucket", async () => {
        svc.recordHttpRequest("GET", "/api/health", "200", 0.03);

        const metrics = await svc.getMetrics();
        expect(metrics).toMatch(
            /http_request_duration_seconds_bucket\{le="0\.05",method="GET",route="\/api\/health",status_code="200"\}\s+1/,
        );
        expect(metrics).toMatch(
            /http_request_duration_seconds_bucket\{le="0\.025",method="GET",route="\/api\/health",status_code="200"\}\s+0/,
        );
    });

    it("tracks in-flight gauge: increment then decrement returns to zero", async () => {
        svc.incrementHttpInFlight("GET");
        svc.incrementHttpInFlight("GET");

        let metrics = await svc.getMetrics();
        expect(metrics).toMatch(/http_requests_in_flight\{method="GET"\}\s+2/);

        svc.decrementHttpInFlight("GET");
        svc.decrementHttpInFlight("GET");

        metrics = await svc.getMetrics();
        expect(metrics).toMatch(/http_requests_in_flight\{method="GET"\}\s+0/);
    });

    it("tracks in-flight gauge per method independently", async () => {
        svc.incrementHttpInFlight("GET");
        svc.incrementHttpInFlight("POST");
        svc.incrementHttpInFlight("POST");

        const metrics = await svc.getMetrics();
        expect(metrics).toMatch(/http_requests_in_flight\{method="GET"\}\s+1/);
        expect(metrics).toMatch(/http_requests_in_flight\{method="POST"\}\s+2/);
    });
});
