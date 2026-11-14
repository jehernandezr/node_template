# 0024. Persistencia sobre TypeORM con sharding y sagas persistentes

- Estado: Aceptada
- Fecha: 2026-11-14
- Reemplaza: [ADR 0009](0009-rds-postgresql-capa-persistencia-propia.md) en la capa de persistencia. La base sigue siendo RDS PostgreSQL con RDS Proxy y réplicas.
- Diseño: [persistencia sobre TypeORM con sharding y sagas persistentes](../design/persistencia-typeorm-y-sagas.md)

## Contexto

La revisión del 14 de noviembre dejó `@platform/persistence` solo sobre el driver `pg`: cada servicio escribe a mano su `TableDefinition` y el SQL de cada migración (ADR 0009). Las exigencias del usuario para el backend son código enterprise, TypeORM y una plataforma fácil de usar (revisión de las librerías del backend del mismo día). Además, el motor de sagas guarda su bitácora en `InMemorySagaStore`.

## Decisión

- TypeORM es el ORM: entidades, `DataSource`, `EntityManager`, `QueryBuilder` y migraciones generadas con su CLI. `synchronize` va apagado. Un repositorio lleva SQL a mano solo donde TypeORM se queda corto.
- `@platform/persistence` envuelve TypeORM y le suma lo propio de la plataforma: elegir el shard lógico, llegar a la instancia física, mantener la transacción en un solo shard, leer de la réplica y migrar todas las bases. Sus piezas son `ShardDataSources`, `CatalogDataSource`, `ShardResolver`, `TypeOrmTransactionManager`, `EntityManagerProvider`, `ShardedRepository`, `CatalogRepository`, `ShardScope`, `AcrossShards`, `ShardedMigrationRunner` y `PersistenceModule`.
- Cada módulo declara su llave en `PersistenceModule.forFeature({ entities, sharding: { key } })` con `ShardKey.Tenant`, `ShardKey.User` o `ShardKey.Custom`. El servicio escribe entidades, mappers, repositorios y migraciones; el ruteo es transparente.
- Las tablas de la plataforma (outbox, mensajes procesados, idempotencia, directorio de shards y bitácora de sagas) tienen sus entidades y migraciones en `@platform/adapters-postgres`.
- Sagas: `TypeOrmSagaStore` guarda `saga.instances` y `saga.step_log` en un esquema `saga` dentro de la base de shard del servicio que orquesta. Cada escritura protegida es un `UPDATE ... WHERE version = :v AND lease_token = :t`. La tabla `saga_directory` del catálogo del servicio dice dónde vive cada saga, sin payloads.
- `SagaEngine` queda con `start` y `resume`. `SagaModule.forFeature([...])` lo arma con valores por defecto, y un caso de uso llama `sagas.start(Definición, estado, { idempotencyKey })`.

### Puertos, réplica y migraciones

- Los puertos viven en `@platform/kernel`: `TransactionManager`, `UnitOfWork`, `TransactionHook`, `TransactionOptions` e `IsolationLevel` en `kernel/src/ports/transaction/`, y `IdempotencyStore` con `ClaimState` en `kernel/src/ports/idempotency/`. `TypeOrmTransactionManager` implementa el puerto del kernel.
- Las lecturas van a la réplica, salvo dentro de una transacción o con `readPrimary()`. Una transacción toca un solo shard: `ShardScope` con `requireScope` y el error `CROSS_SHARD_TX` lo hacen cumplir.
- Las migraciones son por servicio, en `migrations/shard` y `migrations/catalog`. Se generan con la CLI de TypeORM y las aplica el binario `migrate` con `ShardedMigrationRunner` bajo `pg_advisory_lock`. Cada migración tiene `up` y `down`.

## Consecuencias

### Positivas

- Las migraciones se generan desde las entidades: cada tabla se declara una vez.
- Una saga arranca en la misma transacción que el cambio local que la provoca, y sus datos quedan en la región del tenant (ADR 0010).
- El histórico de cualquier saga se encuentra por su id en el catálogo, sin recorrer shards.

### Costos

- TypeORM es una dependencia grande, y la capa que lo envuelve es código propio que se prueba con dos shards en Postgres real.
- `SagaRecoveryJob` recorre todos los shards del servicio con `AcrossShards` y `FOR UPDATE SKIP LOCKED`.
- La construcción va en tres paquetes del diseño: P1 (núcleo de persistencia), P2 (tablas de la plataforma) y P3 (motor de sagas).

## Alternativas consideradas

- Capa propia sobre `pg` sin ORM (ADR 0009): cada tabla y cada migración se escriben a mano.
- Una base de sagas compartida por todos los servicios: acopla los servicios y es un punto único de falla.
- AWS Step Functions como orquestador: ata la plataforma a AWS, limita el payload a 256 KB y cobra por transición.
