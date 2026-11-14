---
name: backend-persistencia-typeorm
description: Cómo se persiste en node_template con TypeORM sobre PostgreSQL con shards. Entidades, mappers, repositorios que implementan puertos del dominio, transacciones y locking optimista, consultas sin N+1, índices, migraciones generadas y aplicadas con la CLI de TypeORM (incluidas las seguras sin downtime) y sharding por DataSource. Úsala al crear tablas, entidades, repositorios, consultas o migraciones.
---

# Persistencia con TypeORM

El ORM es TypeORM sobre PostgreSQL. Se usan sus capacidades (entidades, `DataSource`, `EntityManager`, `QueryBuilder`, migraciones), sin reemplazarlas por SQL a mano ni por un runner propio. `@platform/persistence` es una capa delgada encima: transacciones, contexto de tenant, sharding, auditoría y la base de los repositorios.

## Entidades

- Viven en `modules/<m>/infrastructure/persistence/entities/<nombre>.entity.ts`. Son de infraestructura: el dominio nunca las importa y nunca salen de `infrastructure/`.
- `@PrimaryColumn('uuid')` con el UUIDv7 que genera la aplicación (`IdGenerator`). Nunca ids autoincrementales ni generados por la base.
- Auditoría, `@VersionColumn` y `@DeleteDateColumn` vienen de una entidad base de `@platform/persistence`.
- Instantes en `timestamptz`. Dinero en `bigint` de unidad menor. Estados como `enum` de TypeScript guardado en `varchar` con `CHECK`, no como tipo `ENUM` de PostgreSQL (alterarlo es costoso).
- Columnas con nombre explícito en `snake_case`, nulabilidad explícita (`nullable: false`) y longitudes en `varchar`.
- Relaciones: se declara solo lo que se usa. `lazy` y `eager` están prohibidos: la carga es siempre explícita. Referencias entre agregados son columnas de id, no `@ManyToOne` navegable.
- Cada entidad declara sus índices (`@Index`) junto a la columna. Ver `references/consultas-e-indices.md`.
- `synchronize` siempre `false`, en todos los ambientes y en las pruebas.

## Repositorios y mappers

- El dominio declara el puerto (`UserRepository`). La infraestructura lo implementa con `TypeOrmUserRepository`, que extiende `BaseRepository<User, UserEntity>` y recibe un `UserMapper` (`toDomain`, `toPersistence`).
- Guardar es por agregado entero. El mapper reconstruye con `User.rehydrate(...)`, nunca con el constructor público ni con `Object.assign`.
- El repositorio obtiene el `EntityManager` de la transacción actual desde `@platform/persistence`. Nunca abre conexiones ni `QueryRunner` por su cuenta, ni usa `dataSource.manager` global dentro de una transacción (saldría de ella).
- Un método de repositorio expresa una necesidad del negocio (`findActiveByEmail`), no un filtro genérico.
- Los errores de la base se traducen a errores de dominio dentro del repositorio (`23505` a la regla de unicidad). Ver `backend-errores`.
- Las lecturas de consulta devuelven DTO de lectura con `select` de las columnas necesarias, no entidades.

```ts
@Injectable()
export class TypeOrmUserRepository
  extends BaseRepository<User, UserEntity>
  implements UserRepository
{
  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.manager().findOne(UserEntity, {
      where: { email: email.value },
    });
    return row ? this.mapper.toDomain(row) : null;
  }
}
```

## Transacciones y concurrencia

- La abre el caso de uso con el puerto `TransactionManager` (Unit of Work). Un caso de uso es una transacción. El outbox se escribe en la misma.
- Dentro de la transacción solo base de datos: nada de llamadas HTTP, SNS, correo ni esperas. Los efectos externos van en `afterCommit`.
- Las transacciones no cruzan shards (`PLATFORM.SHARDING.CROSS_SHARD_TX`).
- Concurrencia por defecto: bloqueo optimista con `@VersionColumn`. Un `UPDATE ... WHERE version = $n` que no afecta filas lanza `ConcurrencyConflictError` reintentable.
- Bloqueo pesimista (`FOR UPDATE`, `SKIP LOCKED` para colas) solo donde el conflicto es esperado y frecuente, como saldos o consumo de lotes.
- Detalle de aislamiento, reintentos y ejemplos en `references/transacciones-y-concurrencia.md`.

## Migraciones

- Cada servicio tiene `backend/apps/<servicio>/migrations/` con subcarpetas `shard/` y `catalog/`.
- Se generan con la CLI a partir de las entidades: `pnpm nx run <servicio>:migration-generate --name=<Nombre>`. Se revisan línea por línea antes del commit: el generador no entiende expand/contract, no usa `CONCURRENTLY` y puede proponer un `DROP` y `ADD` donde quieres un `RENAME`.
- Se aplican con `migration-run` y se revierten con `migration-revert`. Estos comandos cargan JavaScript, así que corren sobre el compilado.
- En despliegue, el binario `migrate` de la app llama a `dataSource.runMigrations()` bajo un `pg_advisory_lock`, para que dos tareas no las apliquen a la vez. Corre como paso previo al despliegue, no al arrancar cada instancia (`migrationsRun: false`).
- Una migración ya aplicada en un ambiente no se edita: se agrega otra. Cada una tiene `up` y `down`, o declara que es irreversible.
- Esquema y datos van en migraciones separadas. Un backfill va por lotes, nunca un `UPDATE` único.
- Cambios compatibles hacia atrás: expand y contract. Regla central: la versión N de la app y la N+1 corren a la vez contra el mismo esquema durante el despliegue.
- Las pruebas de integración aplican las migraciones reales sobre un contenedor limpio y verifican que el esquema resultante coincide con las entidades (generar de nuevo no produce cambios).
- Guía operación por operación en `references/migraciones-sin-downtime.md`.

## Sharding

- Hay un `DataSource` por shard lógico y uno para el catálogo. El enrutamiento elige el `DataSource` según el tenant o el usuario (ADR 0010 y 0023).
- Cada consulta declara su llave (`ShardKey`). Sin llave falla con `PLATFORM.SHARDING.KEY_MISSING`.
- Las lecturas van a la réplica salvo dentro de una transacción o si se necesita leer lo recién confirmado (`readPrimary`).
- Una consulta entre shards es explícita, con límite de concurrencia y resultado posiblemente parcial.

## Antes de integrar

```
- [ ] Entidad con @Index para cada consulta nueva por filtro u orden
- [ ] Sin N+1: sin consultas dentro de bucles, relaciones cargadas en una consulta
- [ ] Migración generada, revisada y con down
- [ ] Migración compatible con la versión anterior de la app
- [ ] Mapper con prueba de ida y vuelta
- [ ] Prueba de integración del repositorio contra PostgreSQL real
```

## Nota sobre el ADR 0009

El ADR 0009 describe una capa sobre `pg` sin ORM. La decisión vigente del proyecto es TypeORM con migraciones por CLI. Si tocas persistencia, actualiza o reemplaza ese ADR en el mismo cambio.
