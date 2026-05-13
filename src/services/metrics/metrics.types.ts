import type { LoggerPort } from "../../utils/logger/logger.types.js";

export interface MetricsRecorderPort {
    recordGithubApiCall(status: "success" | "error", type: "releases" | "rate_limit" | "other"): void;
    recordEmailSent(status: "success" | "error"): void;
    recordScannerRun(status: "success" | "error"): void;
    updateActiveSubscriptions(count: number): void;
}

export interface MetricsGetMetricsPort {
    getMetrics(): Promise<string>;
}

export interface MetricsGetterPort extends MetricsGetMetricsPort {
    initializeMetrics(): Promise<void>;
}

export interface MetricsFactoryPort {
    createMetrics(): {
        registry: unknown;
        activeSubscriptions: unknown;
        githubApiCalls: unknown;
        emailsSent: unknown;
        scannerRuns: unknown;
    };
}

export interface PrometheusRecorderPort {
    recordGithubApiCall(status: "success" | "error", type: "releases" | "rate_limit" | "other"): void;
    recordEmailSent(status: "success" | "error"): void;
    recordScannerRun(status: "success" | "error"): void;
    updateActiveSubscriptions(count: number): void;
}

export interface MetricsInitializerPort {
    initialize(): Promise<void>;
}

export interface MetricsContentPort {
    metrics(): Promise<string>;
}

export interface SubscriptionCounterPort {
    countActiveSubscriptions(): Promise<number>;
}

export interface MetricsServiceDependencies {
    logger: LoggerPort;
    subscriptionRepository: SubscriptionCounterPort;
}

export interface MetricsServicePort extends MetricsRecorderPort, MetricsGetterPort {}
