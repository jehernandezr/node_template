# 0009. RDS PostgreSQL con capa de persistencia propia

- Estado: Aceptada
- Fecha: 2026-11-11

## Contexto

El template original usa `sync({ alter: true })` al arrancar y no tiene migraciones. La plataforma necesita PostgreSQL con RLS, particiones, búsqueda vectorial y replicación lógica, sin que el dominio dependa de un ORM concreto.

## Decisión

La base es RDS PostgreSQL con RDS Proxy y una réplica de lectura. `libs/platform/persistence` es una capa propia sobre TypeORM: el dominio ve solo puertos de repositorio.

- `BaseRepository` ofrece lectura, escritura, bloqueo optimista por columna `version`, `Criteria` propio y Unit of Work con el puerto `TransactionManager`.
- Columnas de auditoría y soft delete automáticos. Cada SQL lleva `/* traceId=… tenantId=… */`.
- Las lecturas van a la réplica. Dentro de una transacción, o justo después de escribir, van al primario.
- Migraciones versionadas con `migration:generate`, `migration:run` y `migration:revert`. `synchronize` siempre apagado.
- Particiones por rango sobre el `id` UUIDv7, declaradas con `@Partitioned`. Un job crea las particiones futuras y archiva las vencidas.
- Auditoría con triggers por entidad que escriben en `audit_log`.

## Consecuencias

Positivas:

- TypeORM puede reemplazarse sin tocar el negocio.
- La búsqueda vectorial vive en la misma base y bajo las mismas reglas de tenant.

Costos:

- La capa es código propio que hay que mantener y probar.
- El comportamiento de RDS Proxy con variables de sesión (`app.tenant_id`) se valida en la fase de persistencia. Hasta entonces es un supuesto.

## Alternativas consideradas

- Motor de búsqueda aparte: el documento lo descarta, porque pgvector resuelve la búsqueda semántica en el mismo shard.
