import type { LoggerPort } from "../../utils/logger/logger.types.js";
<<<<<<< HEAD
import type { MetricsRecorderPort, SubscriptionCounterPort } from "./metrics.types.js";

export class MetricsInitializer {
    constructor(
        private readonly metricsRecorder: Pick<MetricsRecorderPort, "updateActiveSubscriptions">,
=======

export interface MetricsRecorderPort {
    updateActiveSubscriptions(count: number): void;
}

export interface SubscriptionCounterPort {
    countActiveSubscriptions(): Promise<number>;
}

export class MetricsInitializer {
    constructor(
        private readonly metricsRecorder: MetricsRecorderPort,
>>>>>>> dc135d8 (refactor: Refactor health, metrics, scanner and subscription services to follow SOLID and GRASP principles)
        private readonly subscriptionRepository: SubscriptionCounterPort,
        private readonly logger: LoggerPort,
    ) {}

    async initialize(): Promise<void> {
        try {
            const activeSubscriptionsCount = await this.subscriptionRepository.countActiveSubscriptions();
            this.metricsRecorder.updateActiveSubscriptions(activeSubscriptionsCount);
            this.logger.info(`Metrics initialized with ${activeSubscriptionsCount} active subscriptions`);
        } catch (error) {
            this.logger.warn("Failed to initialize metrics", { error });
        }
    }
}
