# Transacciones y concurrencia

## Contenido

- Unidad de trabajo
- EntityManager y QueryRunner
- Aislamiento
- Locking optimista
- Locking pesimista
- Reintentos
- Efectos después del commit

## Unidad de trabajo

El caso de uso abre la transacción por el puerto `TransactionManager`. El repositorio la recoge del contexto asíncrono, así que el mismo código sirve dentro y fuera de una transacción.

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

`MessageBus.publish` escribe en el outbox dentro de la misma transacción y falla si no hay una abierta. Si la función lanza, se deshace todo y el error sale tal cual. Si ya hay una transacción abierta en la misma base, se une a ella.

## EntityManager y QueryRunner

Dentro de `@platform/persistence`, y solo allí:

- `dataSource.transaction(async (manager) => ...)` cubre casi todo.
- `QueryRunner` manual solo si hace falta control fino de `commit` y `rollback` (por ejemplo, la bitácora de sagas, que confirma pasos en transacciones separadas). Siempre `try/catch/finally` con `release()` en el `finally`, o `await using`.

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

Dentro de una transacción todo usa `queryRunner.manager` o el `manager` recibido. Un `repository` o `dataSource.manager` tomado de fuera corre en otra conexión y queda fuera de la transacción.

## Aislamiento

- `READ COMMITTED` (por defecto) para la mayoría.
- `REPEATABLE READ` o `SERIALIZABLE` solo para invariantes que cruzan filas (por ejemplo, sumas que no deben pasar un tope), y con reintento ante `40001`.
- Transacciones de solo lectura con `readOnly: true` en las opciones del `TransactionManager`.
- Transacciones cortas, con `statementTimeoutMs`.

## Locking optimista

`@VersionColumn` incrementa en cada `UPDATE`. El repositorio actualiza con `WHERE id = $1 AND version = $2` y, si no afecta filas, lanza `ConcurrencyConflictError` (reintentable). El mapper conserva la versión leída en el agregado y la devuelve al guardar.

```ts
@Entity('accounts')
export class AccountEntity extends BaseEntity {
  @VersionColumn() version!: number;
}
```

El cliente HTTP puede mandar `If-Match` con la versión para detectar ediciones concurrentes de un recurso; un desajuste responde 409 o 412.

## Locking pesimista

```ts
await manager.findOne(AccountEntity, {
  where: { id },
  lock: { mode: 'pessimistic_write' },
});
```

- `pessimistic_write` para saldos o contadores con conflicto frecuente. Siempre dentro de transacción y siempre en el mismo orden de filas, para evitar interbloqueos.
- `FOR UPDATE SKIP LOCKED` para barridos (outbox, recuperación de sagas, backfills): cada worker toma filas distintas.
- Lock de aplicación entre procesos: `pg_advisory_xact_lock`, con la llave derivada del recurso.

## Reintentos

Solo un caso de uso idempotente se reintenta. Reintentar `ConcurrencyConflictError`, `40001` y `40P01` hasta 3 veces con backoff y jitter (`@platform/primitives`), volviendo a leer el agregado en cada intento. No se reintenta dentro de la transacción: se reintenta la transacción entera.

## Efectos después del commit

Publicar a SNS, enviar correo o invalidar caché va en `transactions.afterCommit(...)` o por outbox. Nunca antes del commit: si la transacción se deshace, el efecto ya ocurrió.
