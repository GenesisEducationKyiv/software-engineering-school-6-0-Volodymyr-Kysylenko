import { SAGA_REPLY_QUEUE, SagaReplyEnvelopeSchema } from "@github-release-notifier/broker-contracts";
import type { Channel, ConsumeMessage } from "amqplib";

import type { LoggerPort } from "../utils/logger/logger.types.js";
import type { SagaReplyInput } from "./subscription-confirmation.saga.js";

export interface SagaReplyHandlerPort {
    handleReply(reply: SagaReplyInput): Promise<void>;
}

export interface SagaReplyConsumerDeps {
    channel: Pick<Channel, "consume" | "ack" | "nack">;
    saga: SagaReplyHandlerPort;
    logger: LoggerPort;
}

export class SagaReplyConsumer {
    constructor(private readonly deps: SagaReplyConsumerDeps) {}

    async start(): Promise<void> {
        await this.deps.channel.consume(
            SAGA_REPLY_QUEUE,
            (msg) => {
                void this.handleMessage(msg);
            },
            { noAck: false },
        );
    }

    async handleMessage(message: ConsumeMessage | null): Promise<void> {
        if (!message) return;

        let json: unknown;
        try {
            json = JSON.parse(message.content.toString("utf-8"));
        } catch {
            this.deps.logger.error("Malformed saga reply (invalid JSON)");
            this.deps.channel.ack(message);
            return;
        }

        const result = SagaReplyEnvelopeSchema.safeParse(json);
        if (!result.success) {
            this.deps.logger.error("Invalid saga reply envelope", undefined, {
                issues: result.error.flatten(),
            });
            this.deps.channel.ack(message);
            return;
        }

        const correlationId = result.data.correlationId;
        try {
            await this.deps.saga.handleReply({ correlationId, ...result.data.payload });
        } catch (error) {
            this.deps.logger.error("Failed to handle saga reply", error, { correlationId });
            this.deps.channel.nack(message, false, true);
            return;
        }

        this.deps.channel.ack(message);
    }
}
