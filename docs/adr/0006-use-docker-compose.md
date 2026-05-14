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
- Built-in service wiring and health checks simplify dependable startup ordering for app, database, and cache.

**Negative:**

- No cluster-level orchestration, multi-node failover, or rolling updates.
- Recovery is limited to Docker restart policies, not full self-healing orchestration.
- Single-host deployment introduces a single point of failure.
- Not suitable as-is if the system needs to scale beyond a single node.
- Operational safety still depends on external backup strategy, release procedure discipline, and host-level monitoring.

## Alternatives Considered

**Systemd units with bare Node.js** — the lightest option: no container runtime, direct process management, and fast restarts. Rejected because it requires managing PostgreSQL and Redis as separate host-level services with no isolation, environment parity between local and production is harder to maintain, and dependency health checks and startup ordering must be scripted manually.

**`docker run` with systemd** — adds container isolation without Compose. Rejected because networking, environment injection, resource limits, and startup ordering across three containers require manual scripting that Compose handles declaratively.

**Kubernetes** — provides cluster-level orchestration, rolling updates, and self-healing. Rejected because operational overhead is disproportionate for a single-developer project on a minimal VPS with no multi-node requirements.
