import { NOTIFICATION_ROUTING_KEYS } from "@github-release-notifier/broker-contracts";
import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OutboxRepositoryPort } from "../repositories/outbox.repository.js";
import type { SagaRepositoryPort } from "../sagas/saga.repository.js";
import { SubscriptionConfirmationSaga } from "../sagas/subscription-confirmation.saga.js";

const client = {} as PoolClient;

function makeDeps() {
    const sagaRepository: SagaRepositoryPort = {
        create: vi.fn().mockResolvedValue(undefined),
        complete: vi.fn().mockResolvedValue(undefined),
        fail: vi.fn().mockResolvedValue(undefined),
    };

    const outboxRepository: OutboxRepositoryPort = {
        enqueue: vi.fn().mockResolvedValue(undefined),
        claimBatch: vi.fn(),
        markPublished: vi.fn(),
        markFailed: vi.fn(),
    };

    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

    const saga = new SubscriptionConfirmationSaga({ sagaRepository, outboxRepository, logger });

    return { saga, sagaRepository, outboxRepository, logger };
}

describe("SubscriptionConfirmationSaga.start()", () => {
    it("creates a saga instance and enqueues the confirmation email in the same transaction", async () => {
        const { saga, sagaRepository, outboxRepository } = makeDeps();

        await saga.start(client, {
            subscriptionId: "sub-1",
            email: "user@example.com",
            repo: "owner/repo",
            confirmToken: "tok-confirm",
            unsubscribeToken: "tok-unsub",
        });

        expect(sagaRepository.create).toHaveBeenCalledOnce();
        const createCall = (sagaRepository.create as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(createCall[0]).toBe(client);
        expect(createCall[1]).toMatchObject({ subscriptionId: "sub-1" });
        const correlationId: string = createCall[1].correlationId;
        expect(correlationId).toMatch(/^[0-9a-f-]{36}$/);

        expect(outboxRepository.enqueue).toHaveBeenCalledOnce();
        const [enqueueClient, routingKey, envelope] = (outboxRepository.enqueue as ReturnType<typeof vi.fn>).mock
            .calls[0];
        expect(enqueueClient).toBe(client);
        expect(routingKey).toBe(NOTIFICATION_ROUTING_KEYS["send-confirmation-email"]);
        expect(envelope.correlationId).toBe(correlationId);
        expect(envelope.type).toBe("send-confirmation-email");
        expect(envelope.payload).toMatchObject({
            to: "user@example.com",
            repo: "owner/repo",
            confirmToken: "tok-confirm",
            unsubscribeToken: "tok-unsub",
        });
    });
});

describe("SubscriptionConfirmationSaga.handleReply()", () => {
    let deps: ReturnType<typeof makeDeps>;

    beforeEach(() => {
        deps = makeDeps();
    });

    it("marks saga completed on success reply", async () => {
        await deps.saga.handleReply({
            correlationId: "corr-1",
            step: "send-confirmation-email",
            status: "success",
        });

        expect(deps.sagaRepository.complete).toHaveBeenCalledWith("corr-1");
        expect(deps.sagaRepository.fail).not.toHaveBeenCalled();
        expect(deps.logger.info).toHaveBeenCalledOnce();
    });

    it("marks saga failed on failure reply and logs warning", async () => {
        await deps.saga.handleReply({
            correlationId: "corr-1",
            step: "send-confirmation-email",
            status: "failure",
            error: "SMTP timeout",
        });

        expect(deps.sagaRepository.fail).toHaveBeenCalledWith("corr-1", "SMTP timeout");
        expect(deps.sagaRepository.complete).not.toHaveBeenCalled();
        expect(deps.logger.warn).toHaveBeenCalledOnce();
    });

    it("marks saga failed without error message when error is absent", async () => {
        await deps.saga.handleReply({
            correlationId: "corr-2",
            step: "send-confirmation-email",
            status: "failure",
        });

        expect(deps.sagaRepository.fail).toHaveBeenCalledWith("corr-2", undefined);
    });
});
