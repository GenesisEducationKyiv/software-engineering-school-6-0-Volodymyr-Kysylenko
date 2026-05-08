import { describe, expect, it } from "vitest";

import { metricsService } from "../services/metrics.service.js";

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

        expect(metrics).toMatch(/github_notifier_emails_sent_total{.*status="success".*}\s+1/);
        expect(metrics).toMatch(/github_notifier_api_calls_total{.*status="success".*type="releases".*}\s+1/);
        expect(metrics).toMatch(/github_notifier_active_subscriptions\s+5/);

        console.log("Sample simplified metrics output:");
        console.log("=".repeat(50));

        const businessMetrics = metrics
            .split("\n")
            .filter((line) => line.includes("github_notifier_") || line.startsWith("# HELP github_notifier_"));

        console.log(businessMetrics.join("\n"));
        console.log("=".repeat(50));
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
