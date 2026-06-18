import { SAGA_REPLY_VERSION } from "@github-release-notifier/broker-contracts";
import type { ConsumeMessage } from "amqplib";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SagaReplyConsumer, type SagaReplyHandlerPort } from "../sagas/saga-reply.consumer.js";

function makeEnvelope(payload: object) {
    return {
        messageId: "11111111-1111-1111-1111-111111111111",
        type: "saga-reply",
        version: SAGA_REPLY_VERSION,
        timestamp: new Date().toISOString(),
        correlationId: "cccc1111-cccc-cccc-cccc-cccccccccccc",
        causationId: null,
        payload,
    };
}

function makeMessage(body: unknown): ConsumeMessage {
    return {
        content: Buffer.from(JSON.stringify(body)),
        properties: {},
        fields: {},
    } as unknown as ConsumeMessage;
}

function makeDeps() {
    const channel = { consume: vi.fn(), ack: vi.fn(), nack: vi.fn() };
    const saga: SagaReplyHandlerPort = {
        handleReply: vi.fn().mockResolvedValue(undefined),
    };
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const consumer = new SagaReplyConsumer({ channel, saga, logger });
    return { consumer, channel, saga, logger };
}

describe("SagaReplyConsumer", () => {
    let deps: ReturnType<typeof makeDeps>;

    beforeEach(() => {
        deps = makeDeps();
    });

    it("calls saga.handleReply and acks on a valid success reply", async () => {
        const payload = {
            correlationId: "cccc1111-cccc-cccc-cccc-cccccccccccc",
            step: "send-confirmation-email",
            status: "success",
        };
        const message = makeMessage(makeEnvelope(payload));

        await deps.consumer.handleMessage(message);

        expect(deps.saga.handleReply).toHaveBeenCalledWith(payload);
        expect(deps.channel.ack).toHaveBeenCalledWith(message);
        expect(deps.channel.nack).not.toHaveBeenCalled();
    });

    it("calls saga.handleReply and acks on a valid failure reply", async () => {
        const payload = {
            correlationId: "cccc1111-cccc-cccc-cccc-cccccccccccc",
            step: "send-confirmation-email",
            status: "failure",
            error: "SMTP timeout",
        };
        const message = makeMessage(makeEnvelope(payload));

        await deps.consumer.handleMessage(message);

        expect(deps.saga.handleReply).toHaveBeenCalledWith(payload);
        expect(deps.channel.ack).toHaveBeenCalledWith(message);
    });

    it("acks and skips when JSON is malformed", async () => {
        const message = { content: Buffer.from("not-json"), properties: {}, fields: {} } as unknown as ConsumeMessage;

        await deps.consumer.handleMessage(message);

        expect(deps.saga.handleReply).not.toHaveBeenCalled();
        expect(deps.channel.ack).toHaveBeenCalledWith(message);
        expect(deps.logger.error).toHaveBeenCalledOnce();
    });

    it("acks and skips when envelope schema is invalid", async () => {
        const message = makeMessage({ type: "wrong-type", version: 99 });

        await deps.consumer.handleMessage(message);

        expect(deps.saga.handleReply).not.toHaveBeenCalled();
        expect(deps.channel.ack).toHaveBeenCalledWith(message);
    });

    it("nacks for redelivery when saga.handleReply throws", async () => {
        vi.mocked(deps.saga.handleReply).mockRejectedValue(new Error("DB down"));
        const payload = {
            correlationId: "cccc1111-cccc-cccc-cccc-cccccccccccc",
            step: "send-confirmation-email",
            status: "success",
        };
        const message = makeMessage(makeEnvelope(payload));

        await deps.consumer.handleMessage(message);

        expect(deps.channel.nack).toHaveBeenCalledWith(message, false, true);
        expect(deps.channel.ack).not.toHaveBeenCalled();
    });

    it("ignores null message", async () => {
        await deps.consumer.handleMessage(null);

        expect(deps.saga.handleReply).not.toHaveBeenCalled();
        expect(deps.channel.ack).not.toHaveBeenCalled();
    });
});
