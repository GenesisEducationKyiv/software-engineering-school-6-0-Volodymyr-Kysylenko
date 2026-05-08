# ADR 0002 - Use Node.js, Express, and TypeScript

**Status:** Accepted  
**Date:** 05.05.2026  
**Author:** Volodymyr Kysylenko

---

## Context

A runtime and framework needed to be selected for the backend service. The system requires HTTP request handling, background task scheduling, PostgreSQL and Redis integration, SMTP email delivery, and gRPC server support. The project is educational, maintained by a single TypeScript developer, and should prioritize developer experience, ecosystem maturity, and type safety.

## Decision

Use **Node.js** as the runtime, **Express** as the HTTP framework, and **TypeScript** as the primary language.

## Consequences

**Positive:**

- Full type safety across service.
- Good tooling for testing, linting, and formatting.
- Single language for all layers reduces cognitive context switching.

**Negative:**

- TypeScript compilation step adds build complexity.
- Node.js is single-threaded, CPU-intensive work would require worker threads.

## Alternatives Considered

**Go** - rejected, less development experience with this language.
