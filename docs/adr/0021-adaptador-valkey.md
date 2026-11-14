# 0021. Valkey como adaptador de caché, ruteo, Bloom e invalidación

- Estado: Aceptada
- Fecha: 2026-11-13

## Contexto

El plan elige Valkey para la caché, los datos de vida corta, los filtros de Bloom y la caché de ruteo del sharding. Hasta la auditoría del 13 de noviembre (hallazgo PLAT-07) esos puertos solo tenían versión en memoria, así que las operaciones atómicas de las que depende la corrección del sharding (`setIfNewer` y el tombstone) no se probaban contra un servidor real. Además, cuando un proceso movía un tenant de shard, los demás procesos seguían escribiendo en el shard anterior hasta que vencía su caché local (PLAT-13).

## Decisión

`backend/libs/platform/adapters/valkey` (`@platform/adapters-valkey`) implementa los puertos de `@platform/cache`, `@platform/bloom` y `@platform/sharding` con el cliente `iovalkey`:

- `ValkeyCache` implementa `CachePort` con `GET`, `SET PX`, `SET NX`, `DEL` e `INCR`.
- `ValkeyRoutingCache` implementa la caché de ruteo. `setIfNewer` es un script Lua atómico sobre un hash con valor y versión: solo escribe una versión estrictamente mayor.
- `ValkeyBloomFilter` usa los comandos `BF.*` del módulo de Bloom. `ValkeyBitmapBloomFilter` es el respaldo cuando el servidor no tiene el módulo: usa `BITFIELD` con el mismo orden de bits que el filtro en memoria, así un filtro construido en memoria se puede subir tal cual.
- Los filtros se reconstruyen en una llave temporal y se cambian con `RENAME` en Lua, sin ventana en la que el filtro esté vacío. Por encima de 2^32 bits (por ejemplo la lista de contraseñas filtradas de HIBP), `PartitionedBloomFilter` reparte los elementos en varios filtros.
- Las llaves de cada filtro llevan hash tag (`{nombre}`), así funcionan también en Valkey en clúster.
- `ValkeyShardDirectoryChannel` publica y escucha `ShardDirectoryChanged` por pub/sub. Al recibirlo, cada proceso limpia solo lo que tiene en memoria para ese tenant.

Reglas:

- Los scripts Lua se llaman con `EVALSHA` y se reenvían con `EVAL` ante `NOSCRIPT`.
- `ValkeyCommandError` lleva su `FailureKind`: transitorio con el servidor caído o en failover, permanente con `WRONGTYPE` o un comando inválido, y timeout cuando vence `commandTimeout`. Sus códigos son `PLATFORM.VALKEY.COMMAND_FAILED` y `PLATFORM.VALKEY.UNEXPECTED_REPLY`.
- El timeout de la caché vive solo en la política `Cache` de `@platform/resilience` (100 ms, con circuit breaker). `CacheAside` pasa cada llamada por esa política.
- En AWS cada servicio usa un usuario de Valkey cuya ACL limita sus llaves y canales al prefijo del servicio (ADR 0020), así que el `prefix` del keyspace de cada servicio es su nombre.
- En local, `backend/docker-compose.yml` usa la imagen `valkey/valkey-bundle`, que trae el módulo de Bloom.

La idempotencia no va en Valkey: el plan la ubica en PostgreSQL, en la misma transacción que los efectos (`@platform/persistence`).

## Consecuencias

### Positivas

- Las operaciones atómicas del sharding se prueban contra Valkey real (pruebas de integración con Testcontainers, que se saltan sin Docker).
- Un cambio de directorio llega a todos los procesos en cuanto se publica, sin esperar el vencimiento de la caché local.
- El mismo código corre con o sin el módulo de Bloom.

### Costos

- Pub/sub entrega como máximo una vez: un proceso desconectado durante el aviso no lo recibe. Lo cubren el tombstone del directorio y el TTL de la caché local.
- Escuchar `ShardDirectoryChanged` exige una conexión dedicada por proceso.
- Los scripts Lua son código que hay que mantener junto con sus pruebas.

## Alternativas consideradas

- Invalidar por el bus de mensajería (SNS/SQS): una cola por servicio reparte cada mensaje a un solo consumidor, y la invalidación tiene que llegar a todos los procesos.
- Solo `BF.*`: exige el módulo de Bloom en todos los entornos; el respaldo con bitmaps evita esa dependencia.
