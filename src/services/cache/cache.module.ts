import type { LoggerPort } from "../../utils/logger/logger.types.js";
import { RedisCacheConnection } from "./cache.connection.js";
import { JsonCacheSerializer } from "./cache.serializer.js";
import { CacheService } from "./cache.service.js";
import type {
    CacheClientFactory,
    CacheConfig,
    CacheLifecyclePort,
    CacheServiceDependencies,
    CacheServicePort,
} from "./cache.types.js";
import { NoOpCacheLifecycle } from "./noop/cache.lifecycle.noop.js";
import { NoOpCacheService } from "./noop/cache.noop.js";

export interface CreateCacheModuleDependencies {
    config: CacheConfig;
    logger: LoggerPort;
    createClient: CacheClientFactory;
}

export interface CacheModule {
    cacheService: CacheServicePort;
    cacheLifecycle: CacheLifecyclePort;
}

export function createCacheModule(deps: CreateCacheModuleDependencies): CacheModule {
    if (!deps.config.enabled) {
        return {
            cacheService: new NoOpCacheService(),
            cacheLifecycle: new NoOpCacheLifecycle(),
        };
    }

    const store = new RedisCacheConnection({
        config: deps.config,
        logger: deps.logger,
        createClient: deps.createClient,
    });

    const serviceDeps: CacheServiceDependencies = {
        config: {
            defaultTtlSeconds: deps.config.defaultTtlSeconds,
        },
        logger: deps.logger,
        store,
        serializer: new JsonCacheSerializer(),
    };

    return {
        cacheService: new CacheService(serviceDeps),
        cacheLifecycle: store,
    };
}
