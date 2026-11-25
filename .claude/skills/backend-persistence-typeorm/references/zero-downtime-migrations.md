# Safe migrations without downtime

## Contents

- Principles
- Operation by operation
- Expand and contract
- Batched backfill
- Migration without a transaction
- Transaction mode
- Verification

## Principles

- App version N and N+1 run at the same time during a deploy. The schema must serve both.
- Each migration is small, one intent. Schema and data go separately.
- Once applied in an environment, a migration is immutable. Fix it with another one.
- In production you only move forward. `migration-revert` is for development and emergencies, and the `down` reversal must be tested.
- Test them with volume similar to production: a migration that is fast with 100 rows can lock with 10 million.
- Give the migration a lock cap so it fails instead of queueing the whole app: `SET LOCAL lock_timeout = '5s'`.

## Operation by operation

- Add column: dangerous: `NOT NULL` without a default on a large table with old versions writing; safe: add it nullable (or with a constant default), backfill, then `CHECK ... NOT VALID` and `VALIDATE CONSTRAINT`, then `SET NOT NULL`
- Add index: dangerous: plain `CREATE INDEX`: it blocks writes; safe: `CREATE INDEX CONCURRENTLY` in a migration without a transaction
- Unique index: dangerous: creating it directly on data that may have duplicates; safe: clean duplicates, `CREATE UNIQUE INDEX CONCURRENTLY`, then `ADD CONSTRAINT ... USING INDEX`
- Add foreign key: dangerous: direct `ADD FOREIGN KEY`: it locks both tables; safe: `ADD CONSTRAINT ... NOT VALID`, then `VALIDATE CONSTRAINT`
- Rename column: dangerous: `RENAME COLUMN` while the old app reads it; safe: expand and contract
- Change type: dangerous: `ALTER COLUMN TYPE`: it rewrites the table; safe: new column, dual write, backfill, switch reads, drop the old one
- Drop column: dangerous: while the code still uses it; safe: remove its use from the code, deploy, then drop it in another migration
- Drop table: dangerous: same; safe: same, and after a period with no reads

The TypeORM generator proposes `DROP` plus `ADD` for renames and type changes, and `CREATE INDEX` without `CONCURRENTLY`. Rewrite it by hand before the commit. Keep the generator output and edit it; do not write it all from scratch.

## Expand and contract

A rename from `users.name` to `users.full_name`, in three deploys:

1. Expand. Migration 1 adds a nullable `full_name`. App N+1 writes to both columns and reads from `name`.
2. Migrate. Migration 2 runs the batched backfill. The app reads from `full_name` and keeps writing to both. Equality is verified.
3. Contract. The app stops using `name`. Migration 3, in a later deploy, drops `name`.

Each phase is a separate deploy and migration. The entity reflects the schema of the phase, not the final one.

## Batched backfill

```ts
export class BackfillUserFullName1731000000000 implements MigrationInterface {
  name = 'BackfillUserFullName1731000000000';
  transaction = false as const;

  async up(queryRunner: QueryRunner): Promise<void> {
    let updated: number;
    do {
      const result = await queryRunner.query(
        `WITH batch AS (
           SELECT id FROM users WHERE full_name IS NULL
           ORDER BY id LIMIT 5000 FOR UPDATE SKIP LOCKED)
         UPDATE users SET full_name = name FROM batch WHERE users.id = batch.id`,
      );
      updated = result[1];
    } while (updated > 0);
  }

  async down(): Promise<void> {
    // Nothing to undo: the old column is still intact.
  }
}
```

- Batches of thousands of rows, each in its own commit. It stops when a batch updates nothing.
- A very large backfill runs as a job, not as a migration, so it does not hold up the deploy.

## Migration without a transaction

`CREATE INDEX CONCURRENTLY` does not run inside a transaction. TypeORM wraps migrations in a transaction according to `migrationsTransactionMode` (`all` by default, `each`, `none`). Declare it per migration with `transaction = false` on the class, or apply `none` to the command. A migration with concurrent operations does not mix in other changes, because without a transaction it is not rolled back halfway.

```ts
export class AddUserEmailIndex1731000000001 implements MigrationInterface {
  name = 'AddUserEmailIndex1731000000001';
  transaction = false as const;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS idx_users_email`,
    );
  }
}
```

If `CONCURRENTLY` fails it leaves an invalid index: `DROP INDEX` and retry. That is why it is written with `IF NOT EXISTS`.

## Transaction mode

- `migrationsTransactionMode: 'each'` so a failed migration does not undo the earlier ones already applied, and each one is recorded in the migrations table.
- All under `pg_advisory_lock`, a single task at a time per database.
- With shards, the migrator walks every shard and the catalog; a failing shard is reported and does not block the rest, and the deploy does not proceed until all are up to date.

## Verification

```
- [ ] The previous app works with the new schema
- [ ] The new app works with the previous schema (for rollback)
- [ ] No long locks: lock_timeout set
- [ ] New indexes CONCURRENTLY in a migration without a transaction
- [ ] Backfill in batches and in a separate migration
- [ ] down tested, or declared irreversible
- [ ] Tested on a copy with real volume
- [ ] migration-generate afterwards produces no differences
```
