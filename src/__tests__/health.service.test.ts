import { beforeEach, describe, expect, it, vi } from "vitest";

import { HealthService } from "../services/health/health.service.js";
import { HealthStatusCalculator } from "../services/health/health.status.js";
import type {
    HealthCheck,
    HealthCheckFunction,
    HealthEnvironmentPort,
    HealthServiceDependencies,
} from "../services/health/health.types.js";

function createTestEnvironment(): HealthEnvironmentPort {
    return {
        getNow: vi.fn(() => new Date("2023-09-13T12:00:00Z")),
        getUptime: vi.fn(() => 3600),
        getVersion: vi.fn(() => "1.2.3"),
    };
}

function createHealthService(checks?: Map<string, HealthCheckFunction>): {
    service: HealthService;
    environment: HealthEnvironmentPort;
} {
    const environment = createTestEnvironment();

    const deps: HealthServiceDependencies = {
        statusCalculator: new HealthStatusCalculator(),
        environment,
        checks,
    };

    return {
        service: new HealthService(deps),
        environment,
    };
}

describe("HealthService", () => {
    describe("getHealth", () => {
        it("should return healthy status with empty checks", async () => {
            const { service } = createHealthService();

            const result = await service.getHealth();

            expect(result.status).toBe("healthy");
            expect(result.checks).toEqual([]);
            expect(result.timestamp).toBe("2023-09-13T12:00:00.000Z");
            expect(result.uptime).toBe(3600);
            expect(result.version).toBe("1.2.3");
        });

        it("should execute all configured checks", async () => {
            const checks = new Map<string, HealthCheckFunction>([
                [
                    "database",
                    vi.fn<HealthCheckFunction>().mockResolvedValue({
                        name: "database",
                        status: "healthy",
                    }),
                ],
                [
                    "cache",
                    vi.fn<HealthCheckFunction>().mockResolvedValue({
                        name: "cache",
                        status: "healthy",
                    }),
                ],
            ]);

            const { service } = createHealthService(checks);

            const result = await service.getHealth();

            expect(result.checks).toHaveLength(2);
            expect(result.checks[0].name).toBe("database");
            expect(result.checks[1].name).toBe("cache");
        });

        it("should record response time for each check", async () => {
            const checks = new Map<string, HealthCheckFunction>([
                [
                    "slow",
                    async () => {
                        await new Promise((resolve) => setTimeout(resolve, 50));

                        return {
                            name: "slow",
                            status: "healthy",
                        };
                    },
                ],
            ]);

            const { service } = createHealthService(checks);

            const result = await service.getHealth();

            expect(result.checks[0].responseTime).toBeDefined();
            expect(result.checks[0].responseTime ?? 0).toBeGreaterThanOrEqual(50);
        });

        it("should calculate overall status as unhealthy if any check is unhealthy", async () => {
            const checks = new Map<string, HealthCheckFunction>([
                [
                    "healthy",
                    vi.fn<HealthCheckFunction>().mockResolvedValue({
                        name: "healthy",
                        status: "healthy",
                    }),
                ],
                [
                    "unhealthy",
                    vi.fn<HealthCheckFunction>().mockResolvedValue({
                        name: "unhealthy",
                        status: "unhealthy",
                    }),
                ],
            ]);

            const { service } = createHealthService(checks);

            const result = await service.getHealth();

            expect(result.status).toBe("unhealthy");
        });

        it("should calculate overall status as degraded if any check is degraded but none unhealthy", async () => {
            const checks = new Map<string, HealthCheckFunction>([
                [
                    "healthy",
                    vi.fn<HealthCheckFunction>().mockResolvedValue({
                        name: "healthy",
                        status: "healthy",
                    }),
                ],
                [
                    "degraded",
                    vi.fn<HealthCheckFunction>().mockResolvedValue({
                        name: "degraded",
                        status: "degraded",
                    }),
                ],
            ]);

            const { service } = createHealthService(checks);

            const result = await service.getHealth();

            expect(result.status).toBe("degraded");
        });

        it("should handle check errors gracefully", async () => {
            const checks = new Map<string, HealthCheckFunction>([
                ["failing", vi.fn<HealthCheckFunction>().mockRejectedValue(new Error("Database connection failed"))],
                [
                    "working",
                    vi.fn<HealthCheckFunction>().mockResolvedValue({
                        name: "working",
                        status: "healthy",
                    }),
                ],
            ]);

            const { service } = createHealthService(checks);

            const result = await service.getHealth();

            expect(result.checks).toHaveLength(2);
            expect(result.checks[0]).toMatchObject({
                name: "failing",
                status: "unhealthy",
                message: "Database connection failed",
                responseTime: undefined,
            });
            expect(result.status).toBe("unhealthy");
        });

        it("should handle non-Error exceptions in checks", async () => {
            const checks = new Map<string, HealthCheckFunction>([
                ["throwing", vi.fn<HealthCheckFunction>().mockRejectedValue("unexpected error")],
            ]);

            const { service } = createHealthService(checks);

            const result = await service.getHealth();

            expect(result.checks[0]).toMatchObject({
                name: "throwing",
                status: "unhealthy",
                message: "Unknown error",
            });
        });

        it("should preserve check details", async () => {
            const checks = new Map<string, HealthCheckFunction>([
                [
                    "database",
                    vi.fn<HealthCheckFunction>().mockResolvedValue({
                        name: "database",
                        status: "healthy",
                        details: {
                            connections: 5,
                            maxConnections: 10,
                        },
                    }),
                ],
            ]);

            const { service } = createHealthService(checks);

            const result = await service.getHealth();

            expect(result.checks[0].details).toEqual({
                connections: 5,
                maxConnections: 10,
            });
        });

        it("should preserve check message", async () => {
            const checks = new Map<string, HealthCheckFunction>([
                [
                    "cache",
                    vi.fn<HealthCheckFunction>().mockResolvedValue({
                        name: "cache",
                        status: "degraded",
                        message: "Response time high",
                    }),
                ],
            ]);

            const { service } = createHealthService(checks);

            const result = await service.getHealth();

            expect(result.checks[0].message).toBe("Response time high");
        });

        it("should use environment port for system information", async () => {
            const { service, environment } = createHealthService();

            await service.getHealth();

            expect(environment.getNow).toHaveBeenCalled();
            expect(environment.getUptime).toHaveBeenCalled();
            expect(environment.getVersion).toHaveBeenCalled();
        });
    });
});

describe("HealthStatusCalculator", () => {
    let calculator: HealthStatusCalculator;

    beforeEach(() => {
        calculator = new HealthStatusCalculator();
    });

    it("should return healthy for empty checks", () => {
        expect(calculator.calculateOverallStatus([])).toBe("healthy");
    });

    it("should return unhealthy if any check is unhealthy", () => {
        const checks: HealthCheck[] = [
            { name: "check1", status: "healthy" },
            { name: "check2", status: "unhealthy" },
            { name: "check3", status: "degraded" },
        ];

        expect(calculator.calculateOverallStatus(checks)).toBe("unhealthy");
    });

    it("should return degraded if any check is degraded but none unhealthy", () => {
        const checks: HealthCheck[] = [
            { name: "check1", status: "healthy" },
            { name: "check2", status: "healthy" },
            { name: "check3", status: "degraded" },
        ];

        expect(calculator.calculateOverallStatus(checks)).toBe("degraded");
    });

    it("should return healthy if all checks are healthy", () => {
        const checks: HealthCheck[] = [
            { name: "check1", status: "healthy" },
            { name: "check2", status: "healthy" },
        ];

        expect(calculator.calculateOverallStatus(checks)).toBe("healthy");
    });
});
