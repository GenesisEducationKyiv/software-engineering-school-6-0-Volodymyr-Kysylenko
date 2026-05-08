# ADR 0006 - Use Docker Compose for Local and Production Deployment

**Status:** Accepted  
**Date:** 05.05.2026  
**Author:** Volodymyr Kysylenko

---

## Context

The system consists of multiple services - the application, a relational database, and an optional cache - that must be started, networked, and configured together. A deployment strategy was needed for both local development and the production VPS environment.

## Decision

Use **Docker Compose** to build and orchestrate all services.

## Consequences

**Positive:**

- Consistent environment across developer machines and the production server.
- Simple deployment: pull, build, and restart with a single command.
- Resource limits per service prevent any one container from starving the host.

**Negative:**

- No automatic container orchestration, self-healing, or rolling updates.
- Single-host deployment introduces a single point of failure.
- Not suitable as-is if the system needs to scale beyond a single node.

## Alternatives Considered

**Kubernetes** - rejected, operational overhead is disproportionate for a single-developer educational project on a minimal VPS.
