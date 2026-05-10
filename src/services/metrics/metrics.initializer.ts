import type { LoggerPort } from "../../utils/logger/logger.types.js";

export interface MetricsRecorderPort {
    updateActiveSubscriptions(count: number): void;
}

export interface SubscriptionCounterPort {
    countActiveSubscriptions(): Promise<number>;
}

export class MetricsInitializer {
    constructor(
        private readonly metricsRecorder: MetricsRecorderPort,
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
