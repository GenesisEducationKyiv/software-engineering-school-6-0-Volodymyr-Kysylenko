# ADR 0002 - Use Node.js, Express, and TypeScript

**Status:** Accepted  
**Date:** 05.05.2026  
**Author:** Volodymyr Kysylenko

---

## Context

A runtime and framework needed to be selected for the backend service. The system requires HTTP request handling, background task scheduling, PostgreSQL and Redis integration, SMTP email delivery, and gRPC server support. The project is educational, maintained by a single TypeScript developer, and should prioritize developer experience, ecosystem maturity, and type safety.

## Decision

Use **Node.js** as the runtime, **Express** as the HTTP framework, and **TypeScript** as the primary language.

This stack was selected because it provides:

- Strong ecosystem support for HTTP APIs, PostgreSQL, Redis, SMTP, and gRPC integrations.
- Fast development velocity and low operational complexity for a single-developer educational project.
- Shared language and type system across the entire application.
- Mature tooling for testing, validation, linting, and observability.
- Good fit for I/O-bound workloads such as API handling, database access, email delivery, and external API communication.

## Consequences

**Positive:**

- Full type safety across service.
- Good tooling for testing, linting, and formatting.
- Single language for all layers reduces cognitive context switching.
- Mature ecosystem support for production controls such as validation, security headers, rate limiting, and metrics instrumentation.

**Negative:**

- TypeScript compilation step adds build complexity.
- Node.js is single-threaded, CPU-intensive work would require worker threads.
- Runtime drift between local, CI, and production Node versions can cause avoidable operational issues without strict version pinning.
- Event loop saturation under CPU-heavy tasks can degrade latency unless workloads stay I/O-bound or are offloaded.

## Alternatives Considered

**Fastify** - considered as an alternative HTTP framework. It provides better performance, built-in schema-based validation, and a modern plugin system. However, it was rejected because the project does not have high-performance HTTP requirements, while Express provides a simpler and more familiar API, broader educational value, and enough ecosystem support for the current scope.

**Go** - considered as an alternative backend language and runtime. It provides strong performance, simple deployment, and good concurrency support. However, it was rejected because the project prioritizes rapid iteration, TypeScript ecosystem alignment, and development velocity for a single-developer educational project.
