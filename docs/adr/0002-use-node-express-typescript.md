# ADR 0002 - Use Node.js and TypeScript

**Status:** Accepted  
**Date:** 05.05.2026  
**Author:** Volodymyr Kysylenko

---

## Context

A runtime and language needed to be selected for the backend service. The system is I/O-bound — its primary operations are HTTP API handling, database access, external API calls, and email delivery. The project is educational, maintained by a single developer, and should prioritize type safety, ecosystem breadth, and development velocity.

The HTTP framework selection is a separate decision; see [ADR 0008](0008-use-express-as-http-framework.md).

## Decision

Use **Node.js** as the runtime and **TypeScript** as the primary language.

## Consequences

**Positive:**

- TypeScript provides full type safety across all layers with a single language and shared type system, eliminating context switching between frontend and backend.
- Node.js is well-suited to I/O-bound workloads: non-blocking I/O handles concurrent database, external API, and SMTP calls efficiently without thread management.
- Mature ecosystem for all required integrations: PostgreSQL, Redis, SMTP, gRPC, validation, observability, and testing.

**Negative:**

- TypeScript compilation adds a build step; runtime behavior depends on transpiled output rather than source.
- Node.js is single-threaded — CPU-intensive tasks degrade event loop latency and would require worker threads.
- Node.js version drift between local, CI, and production environments can cause subtle issues without strict version pinning.

## Alternatives Considered

**Go** — provides strong performance, simple deployment, and native concurrency. Rejected because the project prioritizes TypeScript ecosystem alignment and development velocity for a single-developer educational scope.
