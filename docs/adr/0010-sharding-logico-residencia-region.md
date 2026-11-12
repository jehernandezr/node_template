# 0010. Sharding lógico por grupos y residencia por región

- Estado: Aceptada
- Fecha: 2026-11-11

## Contexto

La plataforma atiende muchos tenants, algunos muy grandes, y cada tenant elige su país o región por residencia de datos. Crecer no debe obligar a cambiar el código de negocio ni a interrumpir tenants.

## Decisión

Shard lógico: una base PostgreSQL con el esquema completo del servicio. Varios shards lógicos conviven en una instancia física. La cadena de enrutamiento es tenant, región, grupo de shards, shard lógico e instancia física.

- Un catálogo global guarda solo datos de enrutamiento: directorio tenant a región y grupo, mapa de shard a instancia, índices globales y HMAC del email.
- Cada servicio o entidad declara su llave (`ShardKey.Tenant`, `ShardKey.User` o propia). Sin llave, la query falla con `PLATFORM.SHARDING.KEY_MISSING`.
- Estrategia por defecto `Directory`. Las transacciones no cruzan shards (`PLATFORM.SHARDING.CROSS_SHARD_TX`).
- Los traslados (`SagaType.MoveShard` y `SagaType.MoveTenant`) usan replicación lógica y un candado por tenant en Valkey de menos de un segundo en el corte.
- Cada región despliega su propio stack. El login devuelve la URL regional y el JWT lleva la región (`rgn`).
- `identity` estrena el sharding con un shard por región en producción y dos en local y pruebas.

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
