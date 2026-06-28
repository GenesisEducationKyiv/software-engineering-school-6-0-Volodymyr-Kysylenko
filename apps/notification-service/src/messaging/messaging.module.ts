import {
    assertNotificationTopology,
    type RabbitMqConfig,
    RabbitMqConnection,
} from "@github-release-notifier/broker-contracts";
import type { ConfirmChannel } from "amqplib";

import type { IdempotencyStorePort } from "../idempotency/idempotency.types.js";
import type { EmailServicePort } from "../services/email/email.types.js";
import type { LoggerPort } from "../utils/logger/logger.types.js";
import { NotificationConsumer } from "./notification.consumer.js";

export interface MessagingConfig {
    rabbitmq: RabbitMqConfig;
    prefetch: number;
    appBaseUrl: string;
    publishConfirmTimeoutMs: number;
}

export interface CreateMessagingModuleDependencies {
    config: MessagingConfig;
    emailService: EmailServicePort;
    idempotencyStore: IdempotencyStorePort;
    logger: LoggerPort;
}

export interface MessagingModule {
    connection: RabbitMqConnection<ConfirmChannel>;
    start(): Promise<void>;
}

export function createMessagingModule(deps: CreateMessagingModuleDependencies): MessagingModule {
    const connection = new RabbitMqConnection<ConfirmChannel>({
        config: deps.config.rabbitmq,
        logger: deps.logger,
        createChannel: async (conn) => {
            const channel = await conn.createConfirmChannel();
            await channel.prefetch(deps.config.prefetch);
            return channel;
        },
        setupTopology: assertNotificationTopology,
        onChannelReady: async (channel) => {
            const consumer = new NotificationConsumer({
                channel,
                emailService: deps.emailService,
                idempotencyStore: deps.idempotencyStore,
                logger: deps.logger,
                appBaseUrl: deps.config.appBaseUrl,
                publishConfirmTimeoutMs: deps.config.publishConfirmTimeoutMs,
            });
            await consumer.start();
        },
    });

    return {
        connection,
        start: async () => {
            await connection.connect();
        },
    };
}
