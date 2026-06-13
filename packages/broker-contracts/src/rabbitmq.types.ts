import type { Channel } from "amqplib";

export interface RabbitMqConfig {
    url: string;
}

export interface RabbitMqLifecyclePort {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
}

export interface RabbitMqConnectionPort<TChannel extends Channel = Channel> extends RabbitMqLifecyclePort {
    getChannel(): TChannel;
}
