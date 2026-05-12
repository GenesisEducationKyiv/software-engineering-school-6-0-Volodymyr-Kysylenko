# ADR 0004 - Expose Both REST and gRPC APIs

**Status:** Accepted  
**Date:** 05.05.2026  
**Author:** Volodymyr Kysylenko

---

## Context

The project requirements explicitly required support for both REST and gRPC APIs. At the same time, for the current system scope and expected workload, a REST-only API would have been sufficient for all existing user-facing functionality.

## Decision

Expose all core operations through two independent API surfaces - **REST over HTTP/JSON** and **gRPC over HTTP/2 with Protobuf** - sharing the same underlying service and repository layer.

## Consequences

**Positive:**

- REST surface is accessible from browsers and any HTTP client.
- gRPC surface provides strongly typed, efficient transport for service-to-service consumers.
- Both transports benefit from the same validation, error handling, and logging infrastructure.
- Shared business logic across both transports reduces drift in domain behavior and persistence rules.

**Negative:**

- Two validation paths must be maintained in parallel (middleware for REST, helpers for gRPC).
- Proto schema changes require a build step to regenerate TypeScript stubs.
- Slightly larger testing surface to cover both transports.
- Contract versioning and compatibility checks are required to prevent divergence between REST DTOs and gRPC proto models.
- gRPC traffic currently depends on infrastructure-level TLS termination; stronger service-to-service transport security may be required later.

## Alternatives Considered

**REST only** - not selected because the assignment explicitly required exposing both REST and gRPC APIs.

**gRPC only** - not selected because the assignment explicitly required exposing both REST and gRPC APIs.
