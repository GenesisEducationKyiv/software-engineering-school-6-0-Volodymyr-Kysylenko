# ADR 0003 - Use PostgreSQL as the Primary Database

**Status:** Accepted  
**Date:** 05.05.2026  
**Author:** Volodymyr Kysylenko

---

## Context

The system requires persistent storage for subscription records with clear relational semantics: uniqueness constraints across multiple columns, lifecycle state tracking, and soft deletes. A primary storage engine needed to be selected.

## Decision

Use **PostgreSQL** accessed via raw parameterised SQL through the `pg` driver. No ORM is introduced, because of project requirements.

## Consequences

**Positive:**

- Queries are explicit and auditable with no ORM-generated SQL.
- Strong uniqueness and constraint enforcement at the database level.
- Mature ecosystem.

**Negative:**

- More boilerplate than an ORM.
- Schema evolution requires explicit migration files.
- Single-instance deployment provides no high-availability or read-replica capabilities.

## Alternatives Considered

### Database

**SQLite** - rejected, does not meet project requirements.

### ORM

**Prisma** - rejected, does not meet project requirements.

**Drizzle** - rejected, does not meet project requirements.
