import type { LoggerPort } from "../../utils/logger/logger.types.js";
import type { MetricsRecorderPort, SubscriptionCounterPort } from "./metrics.types.js";

export class MetricsInitializer {
    constructor(
        private readonly metricsRecorder: Pick<MetricsRecorderPort, "updateActiveSubscriptions">,
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
