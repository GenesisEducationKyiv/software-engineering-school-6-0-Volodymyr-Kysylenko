import type { ConfirmChannel } from "amqplib";
import { describe, expect, it, vi } from "vitest";

import { publishWithConfirm } from "../publish.js";

function makeChannel(): { channel: ConfirmChannel; publish: ReturnType<typeof vi.fn> } {
    const publish = vi.fn();
    const channel = { publish } as unknown as ConfirmChannel;
    return { channel, publish };
}

describe("publishWithConfirm", () => {
    it("resolves once the broker confirms the publish", async () => {
        const { channel, publish } = makeChannel();
        publish.mockImplementation(
            (_exchange, _routingKey, _content, _options, callback: (error?: unknown) => void) => {
                callback();
                return true;
            },
        );

        await expect(
            publishWithConfirm(channel, "exchange", "key", Buffer.from("payload"), {}, 1000),
        ).resolves.toBeUndefined();

        expect(publish).toHaveBeenCalledWith("exchange", "key", Buffer.from("payload"), {}, expect.any(Function));
    });

    it("rejects if the confirm callback receives an error", async () => {
        const { channel, publish } = makeChannel();
        publish.mockImplementation(
            (_exchange, _routingKey, _content, _options, callback: (error?: unknown) => void) => {
                callback(new Error("nack"));
                return true;
            },
        );

        await expect(publishWithConfirm(channel, "exchange", "key", Buffer.from("payload"), {}, 1000)).rejects.toThrow(
            "nack",
        );
    });

    it("rejects if no confirm arrives within the timeout", async () => {
        vi.useFakeTimers();
        const { channel, publish } = makeChannel();
        publish.mockImplementation(() => true);

        const promise = publishWithConfirm(channel, "exchange", "key", Buffer.from("payload"), {}, 50);
        const expectation = expect(promise).rejects.toThrow(/timed out/);

        await vi.advanceTimersByTimeAsync(50);
        await expectation;

        vi.useRealTimers();
    });
});
