import { randomUUID } from "node:crypto";

import {
    createEnvelope,
    NOTIFICATION_CONTRACT_VERSION,
    NOTIFICATION_ROUTING_KEYS,
} from "@github-release-notifier/broker-contracts";
import type { PoolClient } from "pg";

import type { OutboxRepositoryPort } from "../repositories/outbox.repository.js";
import type { LoggerPort } from "../utils/logger/logger.types.js";
import type { SagaRepositoryPort } from "./saga.repository.js";

export interface ConfirmationSagaInput {
    subscriptionId: string;
    email: string;
    repo: string;
    confirmToken: string;
    unsubscribeToken: string;
}

export interface SagaReplyInput {
    correlationId: string;
    step: string;
    status: "success" | "failure";
    error?: string;
}

export interface SubscriptionConfirmationSagaPort {
    start(client: PoolClient, input: ConfirmationSagaInput): Promise<void>;
    handleReply(reply: SagaReplyInput): Promise<void>;
}

export class SubscriptionConfirmationSaga implements SubscriptionConfirmationSagaPort {
    constructor(
        private readonly deps: {
            sagaRepository: SagaRepositoryPort;
            outboxRepository: OutboxRepositoryPort;
            logger: LoggerPort;
        },
    ) {}

    async start(client: PoolClient, input: ConfirmationSagaInput): Promise<void> {
        const correlationId = randomUUID();

        await this.deps.sagaRepository.create(client, {
            correlationId,
            subscriptionId: input.subscriptionId,
        });

        const envelope = createEnvelope({
            type: "send-confirmation-email",
            version: NOTIFICATION_CONTRACT_VERSION,
            correlationId,
            payload: {
                to: input.email,
                repo: input.repo,
                confirmToken: input.confirmToken,
                unsubscribeToken: input.unsubscribeToken,
            },
        });

        await this.deps.outboxRepository.enqueue(
            client,
            NOTIFICATION_ROUTING_KEYS["send-confirmation-email"],
            envelope,
        );
    }

    async handleReply(reply: SagaReplyInput): Promise<void> {
        if (reply.status === "success") {
            await this.deps.sagaRepository.complete(reply.correlationId);
            this.deps.logger.info("Subscription confirmation saga completed", {
                correlationId: reply.correlationId,
            });
        } else {
            await this.deps.sagaRepository.fail(reply.correlationId, reply.error);
            this.deps.logger.warn("Subscription confirmation saga failed — email not delivered", undefined, {
                correlationId: reply.correlationId,
                error: reply.error,
            });
        }
    }
}
