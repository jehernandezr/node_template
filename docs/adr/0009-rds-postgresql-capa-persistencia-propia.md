# 0009. RDS PostgreSQL con capa de persistencia propia

- Estado: Aceptada
- Fecha: 2026-11-11
- Revisión: 2026-11-14 (un solo camino sobre `pg`, sin TypeORM)

## Contexto

El template original usa `sync({ alter: true })` al arrancar y no tiene migraciones. La plataforma necesita PostgreSQL con RLS, particiones, búsqueda vectorial y replicación lógica, sin que el dominio dependa de un ORM concreto.

## Decisión

La base es RDS PostgreSQL con RDS Proxy y una réplica de lectura. `libs/platform/persistence` es una capa propia sobre el driver `pg`, sin ORM: el dominio ve solo puertos de repositorio.

Hay un solo camino para cada pieza:

- Conexión: `PgPoolConnection` sobre `pg.Pool`, con un pool para el primario y otro para la réplica.
- Tabla: una `TableDefinition` escrita a mano junto al registro (campo a columna, id, versión, tenant, borrado lógico y auditoría). `BaseRepository` arma todo su SQL desde ella.
- Migraciones: `SqlMigration` en SQL plano, aplicadas con `applyMigrations`. Cada migración corre en su transacción y queda en `platform_schema_migrations`. El ciclo completo toma `pg_advisory_lock`, así dos tareas que arrancan a la vez no aplican la misma migración. No hay `migration:generate`: el SQL se escribe y se revisa.

Además:

- `BaseRepository` ofrece lectura, escritura, bloqueo optimista por columna `version`, `Criteria` propio y Unit of Work con el puerto `TransactionManager`. El puerto vive en `@platform/primitives`, sin la sesión SQL, para que mensajería y la API interna no dependan de esta capa.
- Columnas de auditoría y soft delete automáticos. Cada SQL lleva `/* traceId=… tenantId=… */`.
- Las lecturas van a la réplica, salvo dentro de una transacción. La capa no recuerda escrituras entre peticiones, porque la siguiente puede caer en otro proceso. Quien necesita leer lo que acaba de confirmar sin transacción usa `readPrimary`.
- Particiones por rango sobre el `id` UUIDv7, creadas con `createPartitionedTableSql`. Un job crea las particiones futuras y archiva las vencidas.
- Auditoría con triggers por tabla que escriben en `audit_log`. `@Audited` declara las columnas excluidas junto al registro.
- Los adaptadores de puertos de otras librerías sobre Postgres (idempotencia, directorio de shards, outbox, mensajes procesados) y sus tablas viven en `libs/platform/adapters/postgres`, que exporta `shardMigrations` y `catalogMigrations` completas.

## Consecuencias

Positivas:

- Una sola forma de definir tablas, conectar y migrar, sin metadatos de un ORM que la capa no usa.
- La búsqueda vectorial vive en la misma base y bajo las mismas reglas de tenant.

Costos:

- La capa es código propio que hay que mantener y probar.
- Sin generador de migraciones, cada cambio de esquema se escribe en SQL a mano.
- El comportamiento de RDS Proxy con variables de sesión (`app.tenant_id`) se valida en la fase de persistencia. Hasta entonces es un supuesto.

## Alternativas consideradas

- Motor de búsqueda aparte: el documento lo descarta, porque pgvector resuelve la búsqueda semántica en el mismo shard.
- TypeORM como única vía (entidades, metadatos y `migration:generate`): obliga a declarar cada tabla dos veces, como entidad y como SQL de la capa, y suma una dependencia grande que el repositorio no necesita.
- Lectura del primario durante unos segundos después de escribir: con varias tareas detrás del balanceador solo vale dentro del mismo proceso, así que no da la garantía que promete.
