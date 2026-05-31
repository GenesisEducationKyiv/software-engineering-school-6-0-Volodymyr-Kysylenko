import type promClient from "prom-client";

import type { LoggerPort } from "../../utils/logger/logger.types.js";

export type OperationStatus = "success" | "error";
export type GithubApiCallType = "releases" | "rate_limit" | "other";
export type EmailSendType = "confirmation" | "release";

export interface MetricsHttpPort {
    recordHttpRequest(method: string, route: string, statusCode: string, durationSeconds: number): void;
    incrementHttpInFlight(method: string): void;
    decrementHttpInFlight(method: string): void;
}

export interface MetricsRecorderPort extends MetricsHttpPort {
    recordGithubApiCall(status: OperationStatus, type: GithubApiCallType): void;
    recordGithubApiDuration(type: GithubApiCallType, durationSeconds: number): void;
    recordEmailSent(status: OperationStatus): void;
    recordEmailDuration(type: EmailSendType, durationSeconds: number): void;
    recordScannerRun(status: OperationStatus): void;
    recordScannerRunDuration(durationSeconds: number): void;
    updateActiveSubscriptions(count: number): void;
}

export interface MetricsGetMetricsPort {
    getMetrics(): Promise<string>;
}

export interface MetricsGetterPort extends MetricsGetMetricsPort {
    initializeMetrics(): Promise<void>;
}

export interface MetricsFactoryPort {
    createMetrics(): PrometheusMetricsSet;
}

export interface PrometheusMetricsSet {
    registry: promClient.Registry;
    activeSubscriptions: promClient.Gauge;
    githubApiCalls: promClient.Counter<string>;
    githubApiCallDuration: promClient.Histogram<string>;
    emailsSent: promClient.Counter<string>;
    emailDuration: promClient.Histogram<string>;
    scannerRuns: promClient.Counter<string>;
    scannerRunDuration: promClient.Histogram;
    httpRequestsTotal: promClient.Counter<string>;
    httpRequestDuration: promClient.Histogram<string>;
    httpRequestsInFlight: promClient.Gauge<string>;
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
