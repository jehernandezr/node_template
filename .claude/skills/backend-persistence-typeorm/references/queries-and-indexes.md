# Queries, N+1 and indexes

## Contents

- N+1
- Loading relations
- Pagination
- Indexes
- Probing with EXPLAIN

## N+1

A query inside a loop is a defect.

```ts
// Bad: one query per order
for (const order of orders) {
  order.lines = await manager.find(OrderLineEntity, {
    where: { orderId: order.id },
  });
}

// Good: one query for all of them
const lines = await manager.find(OrderLineEntity, {
  where: { orderId: In(orders.map((order) => order.id)) },
});
const linesByOrder = Map.groupBy(lines, (line) => line.orderId);
```

- For listings, one query with `QueryBuilder` and `leftJoin` plus an explicit `select`, or two queries with `In(...)`.
- `In(...)` with bounded lists (for example, 1000 ids per batch).
- Inside a use case, load the aggregate with everything it needs in one operation, not relation by relation.
- An integration test can count queries (TypeORM logger in the test) and fail if they exceed the expected number.

## Loading relations

- No `eager` or `lazy`. Loading is requested in the query (`relations` or `join`).
- Do not `find` the whole entity to read two columns: use `select`.
- Never return an ORM entity outside `infrastructure/`.

## Pagination

- By cursor with the UUIDv7 id (`?after=<id>`, `ORDER BY id`), not by `OFFSET`. UUIDv7 values grow over time, so the cursor also orders by creation.
- Every listing has a maximum `LIMIT`, enforced in the request zod schema.
- Exact `COUNT(*)` only if the product asks for it; it is expensive on large tables.

## Indexes

- Every frequent filter, join or order column has an index. A composite index follows the order: equalities first, then range or order.
- Shard keys (`tenant_id`) go first in composite indexes of per-tenant tables.
- Uniqueness by business rule: a `UNIQUE` index (partial if there is soft delete: `WHERE deleted_at IS NULL`). The code checks as a courtesy; the database guarantees it.
- Every index costs on writes: add it with a real query that uses it and drop the redundant one.
- A new index on a large table is created `CONCURRENTLY` in a migration without a transaction (see `zero-downtime-migrations.md`).
- Foreign keys on id columns: PostgreSQL does not index them on its own.

## Probing with EXPLAIN

Before integrating a new query on a large table: `EXPLAIN (ANALYZE, BUFFERS)` with realistic volume. A `Seq Scan` on a large table with a selective filter calls for an index. Slow queries are already logged with `DB_SLOW_QUERY_MS` (`maxQueryExecutionTime`).
