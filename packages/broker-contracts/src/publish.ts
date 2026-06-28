import type { ConfirmChannel, Options } from "amqplib";

export type ConfirmPublisherChannel = Pick<ConfirmChannel, "publish">;

export async function publishWithConfirm(
    channel: ConfirmPublisherChannel,
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
