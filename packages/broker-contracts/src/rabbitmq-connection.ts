import amqp, { type Channel, type ChannelModel } from "amqplib";

import type { LoggerPort } from "./logger.types.js";
import type { RabbitMqConfig, RabbitMqConnectionPort } from "./rabbitmq.types.js";

const RECONNECT_INITIAL_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30_000;
const RECONNECT_JITTER_RATIO = 0.25;

export interface RabbitMqConnectionDependencies<TChannel extends Channel> {
    config: RabbitMqConfig;
    logger: LoggerPort;
    createChannel: (connection: ChannelModel) => Promise<TChannel>;
    setupTopology: (channel: TChannel) => Promise<void>;
    onChannelReady?: (channel: TChannel) => Promise<void>;
}

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
        this.closing = false;
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

        if (this.connectPromise) {
            await this.connectPromise.catch(() => undefined);
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
            if (!this.closing) {
                this.scheduleReconnect();
            }
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

        this.deps.logger.warn("RabbitMQ connection closed, scheduling reconnect", undefined, {
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
