# ADR 0004 - Expose Both REST and gRPC APIs

**Status:** Accepted  
**Date:** 05.05.2026  
**Author:** Volodymyr Kysylenko

---

## Context

The system serves two distinct consumer types: browsers and direct HTTP clients that benefit from REST over JSON, and programmatic or service-to-service consumers that benefit from strongly typed, binary-encoded contracts. Both surfaces expose the same four core operations and share the same service and repository layer.

## Decision

Expose all core operations through two independent API surfaces — **REST over HTTP/JSON** and **gRPC over HTTP/2 with Protobuf** — sharing the same underlying service and repository layer.

## Consequences

**Positive:**

- REST is accessible from browsers, HTTP clients, and Swagger UI without additional tooling.
- gRPC provides strongly typed, efficient transport for service-to-service consumers with compile-time contract enforcement via Protobuf schemas.
- Shared business logic across both transports eliminates drift in domain behavior and persistence rules.
- Both surfaces benefit from the same validation, error handling, and logging infrastructure.

**Negative:**

- Two validation paths must be maintained in parallel (Zod middleware for REST, handler helpers for gRPC).
- Proto schema changes require regenerating TypeScript stubs before the build.
- Contract versioning must be managed to prevent divergence between REST DTOs and proto models.
- gRPC traffic relies on infrastructure-level TLS termination; stronger service-to-service transport security may be required later.

## Alternatives Considered

**REST only** — sufficient for all current user-facing functionality. Rejected because it leaves programmatic consumers without a typed, efficient transport option.

**gRPC only** — efficient for service-to-service use but requires additional tooling for browser access and lacks the discoverability that REST with Swagger provides.
