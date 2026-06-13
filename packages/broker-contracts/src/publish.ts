import type { ConfirmChannel, Options } from "amqplib";

/**
 * Publishes a message on a confirm channel and waits for the broker's
 * publisher confirm, rejecting if it doesn't arrive within `timeoutMs`.
 * Used by publishers that must know whether the broker durably accepted
 * the message (e.g. the outbox worker).
 */
export async function publishWithConfirm(
    channel: ConfirmChannel,
    exchange: string,
    routingKey: string,
    content: Buffer,
    options: Options.Publish,
    timeoutMs: number,
): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        let settled = false;

        const timer = setTimeout(() => {
            if (settled) {
                return;
            }
            settled = true;
            reject(new Error(`Publisher confirm timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        channel.publish(exchange, routingKey, content, options, (error: unknown) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timer);

            if (error) {
                reject(error instanceof Error ? error : new Error("Publish failed", { cause: error }));
                return;
            }
            resolve();
        });
    });
}
