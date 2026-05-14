# ADR 0003 - Use PostgreSQL as the Primary Database

**Status:** Accepted  
**Date:** 05.05.2026  
**Author:** Volodymyr Kysylenko

---

## Context

The system requires persistent storage for subscription records with clear relational semantics: uniqueness constraints across multiple columns, lifecycle state tracking, and soft deletes. A primary storage engine and access strategy needed to be selected.

## Decision

Use **PostgreSQL** as the primary relational database, accessed via raw parameterized SQL through the `pg` driver without an ORM.

## Consequences

### PostgreSQL

**Positive:**

- The subscription domain maps naturally to a relational model. Uniqueness across `(email, repo_full_name)`, token lookups, and soft-delete lifecycle state are all cleanly enforced at the database level without application-side guards.
- `pgcrypto`'s `gen_random_uuid()` generates version-4 UUIDs server-side, keeping ID generation consistent and avoiding application-side UUID libraries.
- Mature support for partial indexes, which are used to optimize the scanner's confirmed active subscription query.
- Well-understood operational characteristics and upgrade path if the data model grows.

**Negative:**

- Requires operating a separate database service.
- Single-instance deployment provides no high availability or read-replica capabilities.
- Production reliability depends on explicit backup, restore, and migration rollback procedures.

### Raw SQL without ORM

**Positive:**

- Queries are explicit and auditable — indexes, constraints, and transactions are visible and intentional rather than inferred from ORM configuration.
- No hidden query generation; performance characteristics are predictable.

**Negative:**

- More boilerplate than an ORM for straightforward CRUD.
- Schema changes require explicit migration files.
- Type mapping between database rows and TypeScript models is manual.

## Alternatives Considered

**SQLite** — sufficient for the current data volume, but lacks PostgreSQL's constraint model, partial indexes, and `pgcrypto`. The trade-off favors PostgreSQL given the subscription domain's relational requirements.
