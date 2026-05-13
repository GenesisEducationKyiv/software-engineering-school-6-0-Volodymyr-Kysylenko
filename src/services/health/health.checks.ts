import type {
    DatabaseHealthCheckPort,
    HealthCheckFunction,
    SubscriptionsHealthCheckRepository,
} from "./health.types.js";

export function createDatabaseHealthCheck(database: DatabaseHealthCheckPort): HealthCheckFunction {
    return async () => {
        try {
            await database.checkConnection();

            return {
                name: "database",
                status: "healthy",
                message: "Database connection successful",
            };
        } catch (error) {
            return {
                name: "database",
                status: "unhealthy",
                message: error instanceof Error ? error.message : "Database connection failed",
            };
        }
    };
}

export function createSubscriptionsHealthCheck(
    subscriptionRepository: SubscriptionsHealthCheckRepository,
): HealthCheckFunction {
    return async () => {
        try {
            const count = await subscriptionRepository.countActiveSubscriptions();

            return {
                name: "subscriptions",
                status: "healthy",
                message: `Active subscriptions: ${count}`,
            };
        } catch (error) {
            return {
                name: "subscriptions",
                status: "unhealthy",
                message: error instanceof Error ? error.message : "Subscriptions check failed",
            };
        }
    };
}
