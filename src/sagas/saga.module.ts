import {
    assertSagaReplyTopology,
    type RabbitMqConfig,
    RabbitMqConnection,
} from "@github-release-notifier/broker-contracts";
import type { Channel } from "amqplib";

import type { LoggerPort } from "../utils/logger/logger.types.js";
import { SagaReplyConsumer, type SagaReplyHandlerPort } from "./saga-reply.consumer.js";

export interface SagaModule {
    connection: RabbitMqConnection<Channel>;
    start(): Promise<void>;
    stop(): Promise<void>;
}

export function createSagaModule(deps: {
    config: RabbitMqConfig;
    saga: SagaReplyHandlerPort;
    logger: LoggerPort;
}): SagaModule {
    const connection = new RabbitMqConnection<Channel>({
        config: deps.config,
        logger: deps.logger,
        createChannel: async (conn) => conn.createChannel(),
        setupTopology: assertSagaReplyTopology,
        onChannelReady: async (channel) => {
            const consumer = new SagaReplyConsumer({ channel, saga: deps.saga, logger: deps.logger });
            await consumer.start();
        },
    });

    return {
        connection,
        start: async () => connection.connect(),
        stop: async () => connection.disconnect(),
    };
}
