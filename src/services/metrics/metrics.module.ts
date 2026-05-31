import { MetricsFactory } from "./metrics.factory.js";
import { MetricsInitializer } from "./metrics.initializer.js";
import { MetricsService } from "./metrics.service.js";
import type { MetricsServiceDependencies, MetricsServicePort } from "./metrics.types.js";
import { PrometheusRecorder } from "./prometheus.recorder.js";

export type CreateMetricsModuleDependencies = MetricsServiceDependencies;

export interface MetricsModule {
    metricsService: MetricsServicePort;
}

export function createMetricsModule(deps: CreateMetricsModuleDependencies): MetricsModule {
    const factory = new MetricsFactory();
    const metricsSet = factory.createMetrics();
    const { registry, ...recordableMetrics } = metricsSet;

    const recorder = new PrometheusRecorder(recordableMetrics);

    const initializer = new MetricsInitializer(recorder, deps.subscriptionRepository, deps.logger);

    const metricsService = new MetricsService({ metrics: async () => registry.metrics() }, recorder, initializer);

    return {
        metricsService,
    };
}
