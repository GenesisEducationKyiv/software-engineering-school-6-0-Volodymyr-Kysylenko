import amqp, { type Channel, type ChannelModel } from "amqplib";

import type { LoggerPort } from "./logger.types.js";
import type { RabbitMqConfig, RabbitMqConnectionPort } from "./rabbitmq.types.js";

const RECONNECT_INITIAL_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30_000;
/** +/-25% jitter to avoid thundering-herd reconnects across instances. */
const RECONNECT_JITTER_RATIO = 0.25;

export interface RabbitMqConnectionDependencies<TChannel extends Channel> {
    config: RabbitMqConfig;
    logger: LoggerPort;
    /** Creates (and configures, e.g. confirm mode / prefetch) the channel used by this connection. */
    createChannel: (connection: ChannelModel) => Promise<TChannel>;
    /** Declares exchanges/queues/bindings. Called on every (re)connect. */
    setupTopology: (channel: TChannel) => Promise<void>;
    /** Called once the channel is ready (incl. after every reconnect), e.g. to (re)attach a consumer. */
    onChannelReady?: (channel: TChannel) => Promise<void>;
}

/**
 * Generic RabbitMQ connection/channel lifecycle: idempotent connect/disconnect
 * (concurrent callers share the in-flight promise), automatic reconnection
 * with jittered exponential backoff, and cleanup of partially-created
 * connections/channels if setup fails. Topology and channel-mode (confirm vs
 * regular, prefetch, ...) are injected so this class is reusable for any
 * queue/exchange and any role (publisher or consumer).
 */
export class RabbitMqConnection<TChannel extends Channel = Channel> implements RabbitMqConnectionPort<TChannel> {
    private connection: ChannelModel | null = null;
    private channel: TChannel | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private reconnectDelayMs = RECONNECT_INITIAL_DELAY_MS;
    private closing = false;
    private connectPromise: Promise<void> | null = null;
    private disconnectPromise: Promise<void> | null = null;

    constructor(private readonly deps: RabbitMqConnectionDependencies<TChannel>) {}

    async connect(): Promise<void> {
        if (this.channel) {
            return;
        }
        this.connectPromise ??= this.doConnect().finally(() => {
            this.connectPromise = null;
        });
        await this.connectPromise;
    }

    async disconnect(): Promise<void> {
        this.closing = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (!this.connection && !this.channel) {
            return;
        }

        this.disconnectPromise ??= this.doDisconnect().finally(() => {
            this.disconnectPromise = null;
        });
        await this.disconnectPromise;
    }

    isConnected(): boolean {
        return this.channel !== null;
    }

    getChannel(): TChannel {
        if (!this.channel) {
            throw new Error("RabbitMQ channel is not initialized. Call connect() first.");
        }
        return this.channel;
    }

    private async doConnect(): Promise<void> {
        this.closing = false;

        let connection: ChannelModel | undefined;
        let channel: TChannel | undefined;

        try {
            connection = await amqp.connect(this.deps.config.url);
            connection.on("error", (error) => this.deps.logger.error("RabbitMQ connection error", error));
            connection.on("close", () => this.handleDisconnect());

            channel = await this.deps.createChannel(connection);
            channel.on("error", (error) => this.deps.logger.error("RabbitMQ channel error", error));

            await this.deps.setupTopology(channel);

            this.connection = connection;
            this.channel = channel;
            this.reconnectDelayMs = RECONNECT_INITIAL_DELAY_MS;

            await this.deps.onChannelReady?.(channel);
        } catch (error) {
            await channel?.close().catch(() => undefined);
            await connection?.close().catch(() => undefined);
            this.scheduleReconnect();
            throw error;
        }
    }

    private async doDisconnect(): Promise<void> {
        await this.channel?.close().catch(() => undefined);
        await this.connection?.close().catch(() => undefined);
        this.channel = null;
        this.connection = null;
    }

    private handleDisconnect(): void {
        this.channel = null;
        this.connection = null;

        if (this.closing) {
            return;
        }

        this.deps.logger.warn("RabbitMQ connection closed, scheduling reconnect", {
            delayMs: this.reconnectDelayMs,
        });
        this.scheduleReconnect();
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer) {
            return;
        }

        const jitter = 1 + (Math.random() * 2 - 1) * RECONNECT_JITTER_RATIO;
        const delayMs = Math.round(this.reconnectDelayMs * jitter);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect().catch((error: unknown) => {
                this.deps.logger.error("RabbitMQ reconnect attempt failed", error);
                this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, RECONNECT_MAX_DELAY_MS);
            });
        }, delayMs);
        this.reconnectTimer.unref();
    }
}
