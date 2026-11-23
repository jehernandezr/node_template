# 0029. Mantenimiento entre tenants con RLS y búsqueda por shard

- Estado: Aceptada
- Fecha: 2026-11-22
- Relacionados: [ADR 0023](0023-enrutamiento-de-datos-de-identity.md), [ADR 0024](0024-persistencia-typeorm-sharding-y-sagas-persistentes.md)

## Contexto

Las tablas de tenant tienen RLS forzado por `app.tenant_id` y el rol del servicio no tiene `BYPASSRLS`. Algunos trabajos recorren todos los tenants de un shard: la purga de tareas borradas y el borrado de los datos de un usuario en todos los tenants donde escribió. Sin tenant en la sesión, el RLS no deja ver ninguna fila, y el directorio de shards no ofrece la lista de tenants de un shard. Además, la base de los repositorios de tablas de tenant vivía dentro de identity y `tasks` la necesitaba igual. Por otro lado, `@platform/search` necesita guardar el texto y el vector de cada documento.

## Decisión

- `TenantIsolatedRepository` y `TenantIsolationSql` pasan a `@platform/persistence`. Las lecturas fuera de una transacción van a la réplica dentro de una transacción de solo lectura con el tenant fijado; `readPrimary` queda para lo que debe ver lo recién confirmado.
- Una tabla que lo necesita agrega `TenantIsolationSql.allowMaintenance`: una política que deja pasar la transacción marcada con `app.maintenance = on`. Solo `TenantMaintenanceSession` la marca, y solo vale dentro de esa transacción.
- `@platform/search` guarda los documentos en `search_documents`, una tabla por shard con RLS por tenant, columna `tsvector` generada con el idioma configurado y un vector de pgvector. Los dos modos (`SEARCH_MODE`) usan la misma tabla, así que cambiar de modo no pide migración. La extensión `vector` la crea quien provisiona la base, porque el rol del servicio no puede crear extensiones.

## Consecuencias

Positivas:

- Purgas y borrados de usuario corren con el rol del servicio, sin un rol privilegiado más.
- El RLS sigue siendo la segunda barrera de toda consulta normal.

Costos:

- Una consulta dentro de una transacción de mantenimiento ve todos los tenants del shard: ese código vive solo en los adaptadores de mantenimiento y se prueba contra PostgreSQL real.
- En modo híbrido el vector se calcula al indexar, dentro de la transacción de escritura; con un proveedor remoto de embeddings habrá que indexar después del commit.

## Alternativas consideradas

- Un rol con `BYPASSRLS` para los jobs: otra credencial que rotar y repartir.
- Recorrer los tenants de cada shard: el directorio no los lista por shard y la consulta crece con el número de tenants.
