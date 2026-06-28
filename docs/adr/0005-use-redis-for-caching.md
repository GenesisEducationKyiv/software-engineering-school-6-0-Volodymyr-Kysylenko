# ADR 0005 - Use Redis for Caching External API Responses

**Status:** Accepted  
**Date:** 05.05.2026  
**Author:** Volodymyr Kysylenko

---

## Context

The system relies on a third-party API to verify repository existence and fetch latest releases. This API enforces strict rate limits on unauthenticated requests. The background scanner calls this API frequently - once per unique repository per scan cycle - which risks exhausting the available quota under normal operation.

## Decision

Use **Redis** as a read-through, TTL-based cache for external API responses. Redis is **optional**: the system degrades gracefully to direct API calls when Redis is unavailable or disabled.

## Consequences

**Positive:**

- Reduces risk of hitting external API rate limits during scan cycles.
- Cache failures are non-fatal; the system continues with live API calls.
- TTL configuration gives operators control over data freshness vs. API usage trade-off.
- Optional dependency model improves resilience by avoiding hard downtime on cache unavailability.

**Negative:**

- Adds an infrastructure dependency (Redis container) to the deployment.
- The in-process scanner mutex prevents safe multi-instance deployments without a distributed lock; Redis could serve that role in a future iteration.
- Cached data may be stale up to the configured TTL window.
- Cache bypass periods increase pressure on external API quotas and should be visible through operational metrics and alerts.

## Alternatives Considered

**In-process cache (`Map` / `lru-cache`)** - considered as a simpler caching option without an external infrastructure dependency. It was not selected because cached data would be lost after application restarts and could not be shared across multiple application instances.

**No caching** - considered as the simplest operational option. It was not selected because the background scanner repeatedly calls the GitHub API once per unique repository per scan cycle, which increases the risk of exhausting external API rate limits as the number of tracked repositories grows.
