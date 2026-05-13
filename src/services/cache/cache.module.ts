import type { LoggerPort } from "../../utils/logger/logger.types.js";
import { RedisCacheConnection } from "./cache.connection.js";
import { JsonCacheSerializer } from "./cache.serializer.js";
import { CacheService } from "./cache.service.js";
import type { CacheClientFactory, CacheConfig, CacheServiceDependencies, CacheServicePort } from "./cache.types.js";

export interface CreateCacheModuleDependencies {
    config: CacheConfig;
    logger: LoggerPort;
    createClient: CacheClientFactory;
}

export interface CacheModule {
    cacheService: CacheServicePort;
}

export function createCacheModule(deps: CreateCacheModuleDependencies): CacheModule {
    const store = new RedisCacheConnection({
        config: deps.config,
        logger: deps.logger,
        createClient: deps.createClient,
    });

    const serviceDeps: CacheServiceDependencies = {
        config: {
            enabled: deps.config.enabled,
            defaultTtlSeconds: deps.config.defaultTtlSeconds,
        },
        logger: deps.logger,
        store,
        serializer: new JsonCacheSerializer(),
    };

    return {
        cacheService: new CacheService(serviceDeps),
    };
}
