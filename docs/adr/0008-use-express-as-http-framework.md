# ADR 0008 - Use Express as the HTTP Framework

**Status:** Accepted  
**Date:** 05.05.2026  
**Author:** Volodymyr Kysylenko

---

## Context

With Node.js selected as the runtime (see [ADR 0002](0002-use-node-express-typescript.md)), an HTTP framework needed to be chosen. The system requires request routing, middleware composition, body parsing, and integration with Swagger UI. The project does not have high-throughput HTTP requirements.

## Decision

Use **Express** as the HTTP framework.

## Consequences

**Positive:**

- Minimal, unopinionated API that is straightforward to compose with middleware for security headers, rate limiting, request identity, and logging.
- Broad ecosystem of compatible middleware and tooling.
- Factory-function instantiation (`createApp`) makes the application easy to spin up in integration tests without a running server.

**Negative:**

- No built-in schema validation or serialization — Zod middleware must be wired manually.
- Lower throughput than Fastify under high request volume, which is not a concern at the current scale but would be relevant if HTTP load increased significantly.

## Alternatives Considered

**Fastify** — provides better raw performance, built-in schema validation via JSON Schema, and a modern plugin system. Rejected because the project does not require high-performance HTTP handling, and Express's simpler middleware model is sufficient for the current scope.
