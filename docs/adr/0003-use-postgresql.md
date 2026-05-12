# ADR 0003 - Use PostgreSQL as the Primary Database

**Status:** Accepted  
**Date:** 05.05.2026  
**Author:** Volodymyr Kysylenko

---

## Context

The system requires persistent storage for subscription records with clear relational semantics: uniqueness constraints across multiple columns, lifecycle state tracking, and soft deletes. A primary storage engine needed to be selected.

## Decision

Use **PostgreSQL** as the primary relational database.

Access PostgreSQL using raw parameterised SQL through the `pg` driver. No ORM is introduced, because the project requirements expect direct SQL usage.

## Consequences

### PostgreSQL

**Positive:**

- Strong support for relational data modeling.
- Reliable uniqueness, foreign key, and constraint enforcement at the database level.
- Mature ecosystem and good support for production deployments.
- Suitable for lifecycle state tracking and soft deletes.

**Negative:**

- Requires operating a separate database service.
- Single-instance deployment provides no high availability or read-replica capabilities.
- Production reliability depends on explicit backup, restore, and migration rollback procedures.
- Vertical scaling is the primary near-term path; failover requires additional infrastructure not present in single-node mode.

### Raw SQL without ORM

**Positive:**

- Queries are explicit, auditable, and easy to connect with the educational goals of the project.
- No hidden ORM-generated SQL.
- Direct control over indexes, constraints, joins, and transactions.

**Negative:**

- More boilerplate than using an ORM.
- Schema changes require explicit migration files.
- Less automatic type mapping between database rows and TypeScript models.
- Query correctness and performance tuning rely on review discipline, indexes, and observability rather than ORM safeguards.

## Alternatives Considered

### Database

**SQLite** - rejected because the assignment explicitly required PostgreSQL as the primary database.

### ORM

**Prisma** - rejected because the assignment explicitly required raw SQL through the `pg` driver and did not allow ORM usage.

**Drizzle** - rejected because the assignment explicitly required raw SQL through the `pg` driver and did not allow ORM usage.
