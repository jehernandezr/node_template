---
name: backend-persistencia-typeorm
description: Cómo se persiste en node_template con TypeORM. Entidades, repositorios que implementan puertos del dominio, migraciones generadas y aplicadas con la CLI de TypeORM, transacciones y sharding por DataSource. Úsala al crear tablas, repositorios o migraciones.
---

# Persistencia con TypeORM

El ORM es TypeORM sobre PostgreSQL. Se usan sus capacidades (entidades, `DataSource`, `EntityManager`, `QueryBuilder` y migraciones), sin reemplazarlas por SQL a mano ni por un runner propio. `@platform/persistence` es una capa delgada encima: transacciones, contexto de tenant, sharding, auditoría y la base de los repositorios.

## Entidades

- Las entidades ORM viven en `modules/<m>/infrastructure/persistence/entities/<nombre>.entity.ts`. Son de infraestructura: el dominio nunca las importa.
- `@PrimaryColumn('uuid')` con el id UUIDv7 que genera la aplicación (`IdGenerator`). Nunca ids autoincrementales ni generados por la base.
- Columnas de auditoría, versión (`@VersionColumn`) y borrado lógico (`@DeleteDateColumn`) vienen de una entidad base de `@platform/persistence`.
- Instantes en `timestamptz`.

## Repositorios

- El dominio declara el puerto (`UserRepository`). La infraestructura lo implementa con una clase `TypeOrmUserRepository` que extiende `BaseRepository<User, UserEntity>` y recibe un mapper que convierte entre agregado y entidad.
- El repositorio obtiene el `EntityManager` de la transacción actual a través de `@platform/persistence`. Nunca abre conexiones por su cuenta.

## Migraciones

- Cada servicio tiene su carpeta `backend/apps/<servicio>/migrations/` con una subcarpeta por tipo de base (`shard/` y `catalog/`).
- Se generan con la CLI de TypeORM a partir de las entidades: `pnpm nx run <servicio>:migration-generate --name=<Nombre>`. Se revisan antes del commit.
- Se aplican con `migration-run` y se revierten con `migration-revert`. En despliegue, el binario `migrate` de la app llama a `dataSource.runMigrations()` bajo un `pg_advisory_lock`, para que dos tareas no las apliquen a la vez.
- `synchronize` siempre está apagado.
- Una migración ya aplicada en un ambiente no se edita: se agrega otra.

## Transacciones y sharding

- Las transacciones las abre el caso de uso con el puerto `TransactionManager` (Unit of Work). El outbox se escribe en la misma transacción.
- Hay un `DataSource` por shard lógico y uno para el catálogo. El enrutamiento elige el `DataSource` según el tenant o el usuario (ADR 0010 y 0023).
- Las lecturas van a la réplica salvo dentro de una transacción.
