import { beforeEach, describe, expect, it, vi } from "vitest";

import { MetricsFactory } from "../services/metrics/metrics.factory.js";
import { MetricsInitializer } from "../services/metrics/metrics.initializer.js";
import { MetricsService } from "../services/metrics/metrics.service.js";
import type { SubscriptionRepositoryPort } from "../services/metrics/metrics.types.js";
import { PrometheusRecorder } from "../services/metrics/prometheus.recorder.js";
import type { LoggerPort } from "../utils/logger/logger.types.js";
import { createMockLogger } from "./helpers/mock-logger.js";

describe("MetricsService", () => {
    let service: MetricsService;
    let mockLogger: LoggerPort;
    let mockSubscriptionRepository: SubscriptionRepositoryPort;

    beforeEach(() => {
        mockLogger = createMockLogger();

        mockSubscriptionRepository = {
            countActiveSubscriptions: vi.fn().mockResolvedValue(10),
        };

        // Create metrics using factory
        const factory = new MetricsFactory();
        const metricsSet = factory.createMetrics();

        // Create recorder with metric instances
        const recorder = new PrometheusRecorder({
            activeSubscriptions: metricsSet.activeSubscriptions,
            githubApiCalls: metricsSet.githubApiCalls,
            emailsSent: metricsSet.emailsSent,
            scannerRuns: metricsSet.scannerRuns,
        });

        // Create initializer
        const initializer = new MetricsInitializer(recorder, mockSubscriptionRepository, mockLogger);

        // Create service
        service = new MetricsService(metricsSet, recorder, initializer);
    });

    describe("Recording GitHub API calls", () => {
        it("should record successful GitHub API calls", async () => {
            service.recordGithubApiCall("success", "releases");

            const metrics = await service.getMetrics();
            expect(metrics).toContain('github_notifier_api_calls_total{status="success",type="releases"}');
        });

        it("should record failed GitHub API calls", async () => {
            service.recordGithubApiCall("error", "rate_limit");

            const metrics = await service.getMetrics();
            expect(metrics).toContain('type="rate_limit"');
            expect(metrics).toContain('status="error"');
        });

        it("should support different API call types", async () => {
            service.recordGithubApiCall("success", "releases");
            service.recordGithubApiCall("success", "rate_limit");
            service.recordGithubApiCall("success", "other");

            const metrics = await service.getMetrics();
            expect(metrics).toContain('type="releases"');
            expect(metrics).toContain('type="rate_limit"');
            expect(metrics).toContain('type="other"');
        });

        it("should increment counters correctly", async () => {
            service.recordGithubApiCall("success", "releases");
            service.recordGithubApiCall("success", "releases");

            const metrics = await service.getMetrics();
            expect(metrics).toMatch(/github_notifier_api_calls_total{.*type="releases".*}\s+2/);
        });
    });

    describe("Recording email sent events", () => {
        it("should record successful emails", async () => {
            service.recordEmailSent("success");

            const metrics = await service.getMetrics();
            expect(metrics).toContain('github_notifier_emails_sent_total{status="success"}');
        });

        it("should record failed emails", async () => {
            service.recordEmailSent("error");

            const metrics = await service.getMetrics();
            expect(metrics).toContain('status="error"');
        });

        it("should increment email counters", async () => {
            service.recordEmailSent("success");
            service.recordEmailSent("success");
            service.recordEmailSent("error");

            const metrics = await service.getMetrics();
            expect(metrics).toMatch(/github_notifier_emails_sent_total{status="success"}\s+2/);
            expect(metrics).toMatch(/github_notifier_emails_sent_total{status="error"}\s+1/);
        });
    });

    describe("Recording scanner runs", () => {
        it("should record successful scanner runs", async () => {
            service.recordScannerRun("success");

            const metrics = await service.getMetrics();
            expect(metrics).toContain('github_notifier_scanner_runs_total{status="success"}');
        });

        it("should record failed scanner runs", async () => {
            service.recordScannerRun("error");

            const metrics = await service.getMetrics();
            expect(metrics).toContain('status="error"');
        });

        it("should increment scanner run counters", async () => {
            service.recordScannerRun("success");
            service.recordScannerRun("success");
            service.recordScannerRun("error");

            const metrics = await service.getMetrics();
            expect(metrics).toMatch(/github_notifier_scanner_runs_total{status="success"}\s+2/);
            expect(metrics).toMatch(/github_notifier_scanner_runs_total{status="error"}\s+1/);
        });
    });

    describe("Active subscriptions gauge", () => {
        it("should update active subscriptions gauge", async () => {
            service.updateActiveSubscriptions(5);

            const metrics = await service.getMetrics();
            expect(metrics).toContain("github_notifier_active_subscriptions");
            expect(metrics).toMatch(/github_notifier_active_subscriptions\s+5/);
        });

        it("should set gauge value correctly", async () => {
            service.updateActiveSubscriptions(0);
            let metrics = await service.getMetrics();
            expect(metrics).toMatch(/github_notifier_active_subscriptions\s+0/);

            service.updateActiveSubscriptions(100);
            metrics = await service.getMetrics();
            expect(metrics).toMatch(/github_notifier_active_subscriptions\s+100/);
        });

        it("should track subscription changes", async () => {
            service.updateActiveSubscriptions(10);
            service.updateActiveSubscriptions(15);

            const metrics = await service.getMetrics();
            expect(metrics).toMatch(/github_notifier_active_subscriptions\s+15/);
        });
    });

    describe("Metrics initialization", () => {
        it("should initialize metrics from subscription repository", async () => {
            await service.initializeMetrics();

            expect(mockSubscriptionRepository.countActiveSubscriptions).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith("Metrics initialized with 10 active subscriptions");
        });

        it("should handle initialization errors gracefully", async () => {
            const error = new Error("Database error");
            mockSubscriptionRepository.countActiveSubscriptions = vi.fn().mockRejectedValue(error);

            await service.initializeMetrics();

            expect(mockLogger.warn).toHaveBeenCalledWith("Failed to initialize metrics", { error });
        });

        it("should set active subscriptions during initialization", async () => {
            mockSubscriptionRepository.countActiveSubscriptions = vi.fn().mockResolvedValue(25);

            await service.initializeMetrics();

            const metrics = await service.getMetrics();
            expect(metrics).toMatch(/github_notifier_active_subscriptions\s+25/);
        });
    });

    describe("Metrics retrieval", () => {
        it("should return Prometheus format metrics", async () => {
            const metrics = await service.getMetrics();

            expect(typeof metrics).toBe("string");
            expect(metrics.length).toBeGreaterThan(0);
        });

        it("should include default metrics (process and nodejs)", async () => {
            const metrics = await service.getMetrics();

            expect(metrics).toContain("process_cpu_user_seconds_total");
            expect(metrics).toContain("nodejs_heap_size_total_bytes");
        });

        it("should include custom business metrics", async () => {
            const metrics = await service.getMetrics();

            expect(metrics).toContain("github_notifier_active_subscriptions");
            expect(metrics).toContain("github_notifier_api_calls_total");
            expect(metrics).toContain("github_notifier_emails_sent_total");
            expect(metrics).toContain("github_notifier_scanner_runs_total");
        });

        it("should include metric help text", async () => {
            const metrics = await service.getMetrics();

            expect(metrics).toContain("# HELP github_notifier_active_subscriptions");
            expect(metrics).toContain("# HELP github_notifier_api_calls_total");
            expect(metrics).toContain("# HELP github_notifier_emails_sent_total");
            expect(metrics).toContain("# HELP github_notifier_scanner_runs_total");
        });

        it("should include metric types", async () => {
            const metrics = await service.getMetrics();

            expect(metrics).toContain("# TYPE github_notifier_active_subscriptions gauge");
            expect(metrics).toContain("# TYPE github_notifier_api_calls_total counter");
            expect(metrics).toContain("# TYPE github_notifier_emails_sent_total counter");
            expect(metrics).toContain("# TYPE github_notifier_scanner_runs_total counter");
        });
    });

    describe("Registry access", () => {
        it("should provide registry access", () => {
            const registry = service.getRegistry();
            expect(registry).toBeDefined();
        });
    });

    describe("Integration with multiple metric types", () => {
        it("should record multiple metric types together", async () => {
            service.recordGithubApiCall("success", "releases");
            service.recordEmailSent("success");
            service.recordScannerRun("success");
            service.updateActiveSubscriptions(7);

            const metrics = await service.getMetrics();

            expect(metrics).toContain('github_notifier_api_calls_total{status="success",type="releases"}');
            expect(metrics).toContain('github_notifier_emails_sent_total{status="success"}');
            expect(metrics).toContain('github_notifier_scanner_runs_total{status="success"}');
            expect(metrics).toMatch(/github_notifier_active_subscriptions\s+7/);
        });

        it("should handle complex metric patterns", async () => {
            service.recordGithubApiCall("success", "releases");
            service.recordGithubApiCall("error", "rate_limit");
            service.recordEmailSent("success");
            service.recordEmailSent("error");
            service.recordScannerRun("success");

            const metrics = await service.getMetrics();

            expect(metrics).toMatch(/github_notifier_api_calls_total{.*status="success".*type="releases".*}\s+1/);
            expect(metrics).toMatch(/github_notifier_api_calls_total{.*status="error".*type="rate_limit".*}\s+1/);
            expect(metrics).toMatch(/github_notifier_emails_sent_total{status="success"}\s+1/);
            expect(metrics).toMatch(/github_notifier_emails_sent_total{status="error"}\s+1/);
        });
    });
});
