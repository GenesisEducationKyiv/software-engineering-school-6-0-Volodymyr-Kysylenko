import { EventEmitter } from "node:events";

import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createHttpMetricsMiddleware } from "../middleware/http-metrics.middleware.js";
import type { MetricsHttpPort } from "../services/metrics/metrics.types.js";

function makeMetrics(): MetricsHttpPort {
    return {
        recordHttpRequest: vi.fn(),
        incrementHttpInFlight: vi.fn(),
        decrementHttpInFlight: vi.fn(),
    };
}

function makeReq(overrides: Record<string, unknown> = {}): Request {
    return {
        method: "GET",
        path: "/api/subscriptions",
        baseUrl: "/api",
        route: { path: "/subscriptions" },
        ...overrides,
    } as unknown as Request;
}

function makeRes(statusCode = 200): Response {
    const emitter = new EventEmitter();
    return Object.assign(emitter, { statusCode }) as unknown as Response;
}

const noop: NextFunction = vi.fn();

describe("createHttpMetricsMiddleware", () => {
    let metrics: MetricsHttpPort;

    beforeEach(() => {
        metrics = makeMetrics();
        vi.mocked(noop).mockReset();
    });

    it("calls next() so the request proceeds", () => {
        const middleware = createHttpMetricsMiddleware(metrics);
        middleware(makeReq(), makeRes(), noop);
        expect(noop).toHaveBeenCalledOnce();
    });

    it("increments in-flight immediately, before the response finishes", () => {
        const middleware = createHttpMetricsMiddleware(metrics);
        middleware(makeReq(), makeRes(), noop);

        expect(metrics.incrementHttpInFlight).toHaveBeenCalledWith("GET");
        expect(metrics.decrementHttpInFlight).not.toHaveBeenCalled();
    });

    it("decrements in-flight and records request on 'finish'", () => {
        const middleware = createHttpMetricsMiddleware(metrics);
        const res = makeRes(200);
        middleware(makeReq(), res, noop);

        res.emit("finish");

        expect(metrics.decrementHttpInFlight).toHaveBeenCalledWith("GET");
        expect(metrics.recordHttpRequest).toHaveBeenCalledWith("GET", "/api/subscriptions", "200", expect.any(Number));
    });

    it("uses the matched Express route pattern as the route label", () => {
        const middleware = createHttpMetricsMiddleware(metrics);
        const req = makeReq({ baseUrl: "/api", route: { path: "/subscriptions/:token" } });
        const res = makeRes(200);
        middleware(req, res, noop);

        res.emit("finish");

        expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
            "GET",
            "/api/subscriptions/:token",
            "200",
            expect.any(Number),
        );
    });

    it("falls back to normalized path when no Express route is matched", () => {
        const middleware = createHttpMetricsMiddleware(metrics);
        const req = makeReq({ baseUrl: "", route: null, path: "/unknown/path" });
        const res = makeRes(404);
        middleware(req, res, noop);

        res.emit("finish");

        expect(metrics.recordHttpRequest).toHaveBeenCalledWith("GET", "/unknown/path", "404", expect.any(Number));
    });

    it("normalizes UUID segments in the path when no route is matched", () => {
        const middleware = createHttpMetricsMiddleware(metrics);
        const req = makeReq({
            baseUrl: "",
            route: null,
            path: "/api/550e8400-e29b-41d4-a716-446655440000/details",
        });
        const res = makeRes(200);
        middleware(req, res, noop);

        res.emit("finish");

        expect(metrics.recordHttpRequest).toHaveBeenCalledWith("GET", "/api/:uuid/details", "200", expect.any(Number));
    });

    it("normalizes numeric ID segments in the path when no route is matched", () => {
        const middleware = createHttpMetricsMiddleware(metrics);
        const req = makeReq({ baseUrl: "", route: null, path: "/users/42/posts/7" });
        const res = makeRes(200);
        middleware(req, res, noop);

        res.emit("finish");

        expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
            "GET",
            "/users/:id/posts/:id",
            "200",
            expect.any(Number),
        );
    });

    it("decrements in-flight on 'close' (client disconnect) without recording request", () => {
        const middleware = createHttpMetricsMiddleware(metrics);
        const res = makeRes();
        middleware(makeReq(), res, noop);

        res.emit("close");

        expect(metrics.decrementHttpInFlight).toHaveBeenCalledOnce();
        expect(metrics.recordHttpRequest).not.toHaveBeenCalled();
    });

    it("does not double-decrement in-flight when both 'finish' and 'close' fire", () => {
        const middleware = createHttpMetricsMiddleware(metrics);
        const res = makeRes(200);
        middleware(makeReq(), res, noop);

        res.emit("finish");
        res.emit("close");

        expect(metrics.decrementHttpInFlight).toHaveBeenCalledOnce();
    });

    it("records a positive duration in seconds", () => {
        const middleware = createHttpMetricsMiddleware(metrics);
        const res = makeRes(200);
        middleware(makeReq(), res, noop);

        res.emit("finish");

        const call = vi.mocked(metrics.recordHttpRequest).mock.calls[0];
        const duration = call[3];
        expect(duration).toBeGreaterThanOrEqual(0);
        expect(duration).toBeLessThan(1);
    });

    it.each(["/api/metrics", "/api/health"])("skips tracking for %s (internal endpoint)", (path) => {
        const middleware = createHttpMetricsMiddleware(metrics);
        const req = makeReq({ path, route: null });
        const res = makeRes(200);
        middleware(req, res, noop);

        res.emit("finish");

        expect(metrics.incrementHttpInFlight).not.toHaveBeenCalled();
        expect(metrics.recordHttpRequest).not.toHaveBeenCalled();
        expect(noop).toHaveBeenCalledOnce();
    });

    it("propagates POST method to the in-flight gauge label", () => {
        const middleware = createHttpMetricsMiddleware(metrics);
        const req = makeReq({ method: "POST" });
        const res = makeRes(201);
        middleware(req, res, noop);

        expect(metrics.incrementHttpInFlight).toHaveBeenCalledWith("POST");

        res.emit("finish");

        expect(metrics.decrementHttpInFlight).toHaveBeenCalledWith("POST");
        expect(metrics.recordHttpRequest).toHaveBeenCalledWith("POST", "/api/subscriptions", "201", expect.any(Number));
    });
});
