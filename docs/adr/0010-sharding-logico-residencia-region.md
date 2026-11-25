# 0010. Sharding lógico por grupos y residencia por región

- Estado: Aceptada, modificada por [ADR 0023](0023-enrutamiento-de-datos-de-identity.md), [ADR 0024](0024-persistencia-typeorm-sharding-y-sagas-persistentes.md) y [ADR 0032](0032-traslado-de-tenants-y-regiones.md)
- Fecha: 2026-11-11

## Contexto

La plataforma atiende muchos tenants, algunos muy grandes, y cada tenant elige su país o región por residencia de datos. Crecer no debe obligar a cambiar el código de negocio ni a interrumpir tenants.

## Decisión

Shard lógico: una base PostgreSQL con el esquema completo del servicio. Varios shards lógicos conviven en una instancia física. La cadena de enrutamiento es tenant, región, grupo de shards, shard lógico e instancia física.

- Cada servicio tiene su catálogo, que guarda solo datos de enrutamiento: directorio tenant a región y grupo, mapa de shard a instancia y, en identity, índices globales y HMAC del email.
- Cada servicio o entidad declara su llave (`ShardKey.Tenant`, `ShardKey.User` o propia). Sin llave, la query falla con `PLATFORM.SHARDING.KEY_MISSING`.
- Estrategia por defecto `Directory`. Las transacciones no cruzan shards (`PLATFORM.SHARDING.CROSS_SHARD_TX`).
- Los traslados de un tenant (`MoveTenant`) copian por lotes por defecto, o con replicación lógica cuando el manifiesto lo admite, y frenan las escrituras con una compuerta (en el directorio o en Valkey) y una barrera por tenant en el shard de origen ([ADR 0032](0032-traslado-de-tenants-y-regiones.md)). El traslado de un shard entero (`MoveShard`) no está construido.
- Cada región despliega su propio stack (`REGIONS` y `SERVICE_REGION`). El login devuelve la URL regional, el JWT lleva la región (`rgn`) y un tenant de otra región responde `PLATFORM.SHARDING.WRONG_REGION` (421) con la URL de su API, que `ApiClient` del front sigue una vez ([ADR 0034](0034-repositorios-live-del-front-sse-y-region.md)).
- Los cinco servicios de la plantilla usan shards: uno por región en producción y dos en local y pruebas, con un tenant en cada uno.

## Consecuencias

Positivas:

- Crecer significa agregar shards o mover tenants, sin cambiar el código de negocio.
- Los datos de un tenant permanecen en su región.
- Los traslados ocurren sin que las peticiones fallen.

Costos:

- Las consultas entre shards son explícitas, tienen límite de concurrencia y pueden llegar parciales.
- Cada región nueva es un stack completo que desplegar con Terraform.
- El rebalanceo automático de shards queda para una fase posterior.

## Alternativas consideradas

- `ConsistentHash`: anillo con nodos virtuales, para muchas llaves pequeñas sin catálogo.
- `Range`: rangos de la llave, para llaves con orden natural como las fechas.
- Estrategia propia: implementación de `ShardingStrategy` para reglas de negocio específicas.
- Un solo stack global para todos los tenants: el documento lo descarta por la residencia de datos.
