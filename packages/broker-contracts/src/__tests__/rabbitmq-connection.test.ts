import type { Channel, ChannelModel } from "amqplib";
import amqp from "amqplib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LoggerPort } from "../logger.types.js";
import { RabbitMqConnection } from "../rabbitmq-connection.js";

vi.mock("amqplib", () => ({
    default: { connect: vi.fn() },
}));

function makeLogger(): LoggerPort {
    return {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    };
}

interface FakeConnectionModel {
    on: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    emit: (event: string, ...args: unknown[]) => void;
}

function makeConnectionModel(): FakeConnectionModel {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    return {
        on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
            handlers.set(event, handler);
        }),
        close: vi.fn().mockResolvedValue(undefined),
        emit: (event: string, ...args: unknown[]) => handlers.get(event)?.(...args),
    };
}

function makeChannel(): Channel {
    return {
        on: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
    } as unknown as Channel;
}

const connectMock = amqp.connect as unknown as ReturnType<typeof vi.fn>;

describe("RabbitMqConnection", () => {
    beforeEach(() => {
        connectMock.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("connects, sets up topology, and invokes onChannelReady", async () => {
        const connectionModel = makeConnectionModel();
        const channel = makeChannel();
        connectMock.mockResolvedValue(connectionModel);

        const setupTopology = vi.fn().mockResolvedValue(undefined);
        const onChannelReady = vi.fn().mockResolvedValue(undefined);
        const createChannel = vi.fn().mockResolvedValue(channel);

        const connection = new RabbitMqConnection<Channel>({
            config: { url: "amqp://localhost" },
            logger: makeLogger(),
            createChannel,
            setupTopology,
            onChannelReady,
        });

        await connection.connect();

        expect(connectMock).toHaveBeenCalledWith("amqp://localhost");
        expect(setupTopology).toHaveBeenCalledWith(channel);
        expect(onChannelReady).toHaveBeenCalledWith(channel);
        expect(connection.isConnected()).toBe(true);
        expect(connection.getChannel()).toBe(channel);
    });

    it("is idempotent: concurrent connect() calls share one underlying connection", async () => {
        const connectionModel = makeConnectionModel();
        const channel = makeChannel();
        let resolveConnect: (value: ChannelModel) => void = () => undefined;
        connectMock.mockImplementation(
            async () =>
                new Promise<ChannelModel>((resolve) => {
                    resolveConnect = resolve;
                }),
        );

        const connection = new RabbitMqConnection<Channel>({
            config: { url: "amqp://localhost" },
            logger: makeLogger(),
            createChannel: vi.fn().mockResolvedValue(channel),
            setupTopology: vi.fn().mockResolvedValue(undefined),
        });

        const first = connection.connect();
        const second = connection.connect();

        resolveConnect(connectionModel as unknown as ChannelModel);
        await Promise.all([first, second]);

        expect(connectMock).toHaveBeenCalledTimes(1);

        // Already connected: a further call is a no-op.
        await connection.connect();
        expect(connectMock).toHaveBeenCalledTimes(1);
    });

    it("throws from getChannel() before connect() is called", () => {
        const connection = new RabbitMqConnection<Channel>({
            config: { url: "amqp://localhost" },
            logger: makeLogger(),
            createChannel: vi.fn(),
            setupTopology: vi.fn(),
        });

        expect(() => connection.getChannel()).toThrow(/not initialized/);
    });

    it("cleans up a partially-created channel/connection if topology setup fails", async () => {
        const connectionModel = makeConnectionModel();
        const channel = makeChannel();
        connectMock.mockResolvedValue(connectionModel);

        const connection = new RabbitMqConnection<Channel>({
            config: { url: "amqp://localhost" },
            logger: makeLogger(),
            createChannel: vi.fn().mockResolvedValue(channel),
            setupTopology: vi.fn().mockRejectedValue(new Error("topology failed")),
        });

        await expect(connection.connect()).rejects.toThrow("topology failed");

        expect(channel.close).toHaveBeenCalled();
        expect(connectionModel.close).toHaveBeenCalled();
        expect(connection.isConnected()).toBe(false);
    });

    it("disconnect() closes the channel and connection and is idempotent", async () => {
        const connectionModel = makeConnectionModel();
        const channel = makeChannel();
        connectMock.mockResolvedValue(connectionModel);

        const connection = new RabbitMqConnection<Channel>({
            config: { url: "amqp://localhost" },
            logger: makeLogger(),
            createChannel: vi.fn().mockResolvedValue(channel),
            setupTopology: vi.fn().mockResolvedValue(undefined),
        });

        await connection.connect();
        await connection.disconnect();

        expect(channel.close).toHaveBeenCalledTimes(1);
        expect(connectionModel.close).toHaveBeenCalledTimes(1);
        expect(connection.isConnected()).toBe(false);

        // Calling disconnect again on an already-disconnected connection is a no-op.
        await connection.disconnect();
        expect(channel.close).toHaveBeenCalledTimes(1);
    });

    it("schedules a reconnect when the underlying connection closes unexpectedly", async () => {
        vi.useFakeTimers();

        const connectionModel = makeConnectionModel();
        const channel = makeChannel();
        connectMock.mockResolvedValue(connectionModel);

        const setupTopology = vi.fn().mockResolvedValue(undefined);
        const connection = new RabbitMqConnection<Channel>({
            config: { url: "amqp://localhost" },
            logger: makeLogger(),
            createChannel: vi.fn().mockResolvedValue(channel),
            setupTopology,
        });

        await connection.connect();
        expect(connection.isConnected()).toBe(true);

        connectionModel.emit("close");
        expect(connection.isConnected()).toBe(false);

        await vi.advanceTimersByTimeAsync(2000);

        expect(connectMock).toHaveBeenCalledTimes(2);
        expect(connection.isConnected()).toBe(true);
    });

    it("disconnect() called while connect() is in-flight closes resources established by the connect", async () => {
        const connectionModel = makeConnectionModel();
        const channel = makeChannel();
        let resolveConnect: (value: ChannelModel) => void = () => undefined;
        connectMock.mockImplementation(
            async () =>
                new Promise<ChannelModel>((resolve) => {
                    resolveConnect = resolve;
                }),
        );

        const connection = new RabbitMqConnection<Channel>({
            config: { url: "amqp://localhost" },
            logger: makeLogger(),
            createChannel: vi.fn().mockResolvedValue(channel),
            setupTopology: vi.fn().mockResolvedValue(undefined),
        });

        const connectPromise = connection.connect();
        const disconnectPromise = connection.disconnect();

        // Complete the underlying AMQP connect while disconnect() is awaiting it.
        resolveConnect(connectionModel as unknown as ChannelModel);
        await Promise.all([connectPromise, disconnectPromise]);

        expect(channel.close).toHaveBeenCalled();
        expect(connectionModel.close).toHaveBeenCalled();
        expect(connection.isConnected()).toBe(false);
    });

    it("does not schedule a reconnect when disconnect() is called during a failing connect()", async () => {
        vi.useFakeTimers();

        let resolveConnect: (value: ChannelModel) => void = () => undefined;
        connectMock.mockImplementation(
            async () =>
                new Promise<ChannelModel>((resolve) => {
                    resolveConnect = resolve;
                }),
        );

        const connectionModel = makeConnectionModel();
        const channel = makeChannel();

        const connection = new RabbitMqConnection<Channel>({
            config: { url: "amqp://localhost" },
            logger: makeLogger(),
            createChannel: vi.fn().mockResolvedValue(channel),
            setupTopology: vi.fn().mockRejectedValue(new Error("topology failed")),
        });

        const connectPromise = connection.connect();
        const disconnectPromise = connection.disconnect();

        // Let the connect complete; topology will fail inside doConnect().
        resolveConnect(connectionModel as unknown as ChannelModel);
        await Promise.all([connectPromise.catch(() => undefined), disconnectPromise]);

        // Advance time well past all reconnect delays — nothing should fire.
        await vi.advanceTimersByTimeAsync(60_000);

        expect(connectMock).toHaveBeenCalledTimes(1);
        expect(connection.isConnected()).toBe(false);
    });
});
