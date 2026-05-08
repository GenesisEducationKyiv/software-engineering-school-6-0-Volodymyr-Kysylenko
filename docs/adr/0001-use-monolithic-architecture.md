# ADR 0001 - Use Monolithic Architecture

**Status:** Accepted  
**Date:** 05.05.2026  
**Author:** Volodymyr Kysylenko

---

## Context

The system is an educational backend project built by a single developer. It handles user subscriptions, email confirmation, background release scanning, and notification delivery. The expected user load is limited and predictable.

The main architectural choice was between a **monolith** and a **microservices** decomposition.

## Decision

Implement the system as a single deployable unit with a layered architecture:

```
Routes → Middleware → Controllers → Services → Repositories → Database
```

## Consequences

**Positive:**

- Simpler deployment, debugging, and local development.
- Lower infrastructure cost on a single VPS.
- All code shares one test suite, type system, and dependency graph.

**Negative:**

- The background scanner cannot be scaled independently of the REST API.
- The in-process scanner mutex prevents safe horizontal scaling without a coordination mechanism.
- As the domain grows, module coupling risk increases without strict boundary enforcement.

## Alternatives Considered

**Microservices** - rejected due to disproportionate operational complexity for the current scope. Service decomposition, distributed tracing, network contracts, and separate CI pipelines add overhead that is not justified at this scale.
