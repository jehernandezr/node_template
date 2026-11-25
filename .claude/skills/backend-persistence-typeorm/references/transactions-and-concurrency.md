# Transactions and concurrency

## Contents

- Unit of work
- EntityManager and QueryRunner
- Isolation
- Optimistic locking
- Pessimistic locking
- Retries
- Effects after the commit

## Unit of work

The use case opens the transaction through the `TransactionManager` port. The repository picks it up from the async context, so the same code works inside and outside a transaction.

```ts
await this.transactions.runInTransaction(async () => {
  const account = await this.accounts.getById(command.accountId);
  account.withdraw(command.amount, this.clock.now());
  await this.accounts.save(account);
  for (const event of account.pullDomainEvents()) {
    await this.bus.publish(
      AccountWithdrawnV1,
      this.integrationEvents.from(event),
    );
  }
});
```

`MessageBus.publish` writes to the outbox inside the same transaction and fails if none is open. If the function throws, everything is rolled back and the error propagates as is. If a transaction is already open on the same database, it joins it.

## EntityManager and QueryRunner

Inside `@platform/persistence`, and only there:

- `dataSource.transaction(async (manager) => ...)` covers almost everything.
- A manual `QueryRunner` only if fine control of `commit` and `rollback` is needed (for example, the saga log, which commits steps in separate transactions). Always `try/catch/finally` with `release()` in the `finally`, or `await using`.

```ts
const queryRunner = this.dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction('READ COMMITTED');
try {
  await queryRunner.manager.save(entity);
  await queryRunner.commitTransaction();
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
```

Inside a transaction everything uses `queryRunner.manager` or the received `manager`. A `repository` or `dataSource.manager` taken from outside runs on another connection and stays outside the transaction.

## Isolation

- `READ COMMITTED` (the default) for most cases.
- `REPEATABLE READ` or `SERIALIZABLE` only for invariants that span rows (for example, sums that must not exceed a cap), and with a retry on `40001`.
- Read-only transactions with `readOnly: true` in the `TransactionManager` options.
- Short transactions, with `statementTimeoutMs`.

## Optimistic locking

`@VersionColumn` increments on every `UPDATE`. The repository updates with `WHERE id = $1 AND version = $2` and, if no rows are affected, throws `ConcurrencyConflictError` (retryable). The mapper keeps the version it read in the aggregate and passes it back on save.

```ts
@Entity('accounts')
export class AccountEntity extends BaseEntity {
  @VersionColumn() version!: number;
}
```

The HTTP client can send `If-Match` with the version to detect concurrent edits of a resource; a mismatch responds 409 or 412.

## Pessimistic locking

```ts
await manager.findOne(AccountEntity, {
  where: { id },
  lock: { mode: 'pessimistic_write' },
});
```

- `pessimistic_write` for balances or counters with frequent conflict. Always inside a transaction and always in the same row order, to avoid deadlocks.
- `FOR UPDATE SKIP LOCKED` for sweeps (outbox, saga recovery, backfills): each worker takes different rows.
- Application lock across processes: `pg_advisory_xact_lock`, with the key derived from the resource.

## Retries

Only an idempotent use case is retried. Retry `ConcurrencyConflictError`, `40001` and `40P01` up to 3 times with backoff and jitter (`@platform/primitives`), reloading the aggregate on each attempt. Do not retry inside the transaction: retry the whole transaction.

## Effects after the commit

Publishing to SNS, sending email or invalidating the cache goes in `transactions.afterCommit(...)` or through the outbox. Never before the commit: if the transaction rolls back, the effect has already happened.
