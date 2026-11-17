# 0023. Enrutamiento de los datos de identity entre shards

- Estado: Aceptada
- Fecha: 2026-11-13

## Contexto

El ADR 0010 estrena el sharding en identity con `ShardKey.User`: el router ubica el grupo de shards del tenant y elige el shard con hash sobre el usuario. Pero un usuario puede pertenecer a varios tenants, el inicio de sesión llega sin tenant ni usuario, y `ShardedDatabaseResolver` toma el usuario del actor, que en identity casi nunca es el usuario consultado. Además una transacción no puede tocar dos shards.

## Decisión

- **Tenant de origen.** Cada usuario tiene un `homeTenantId` fijo: el tenant compartido de clientes de su región o el tenant que lo invitó. Sus datos (usuario, credenciales, sesiones, dispositivos, MFA, passkeys, intentos) se enrutan con `ShardKey.User` dentro del grupo de ese tenant. El access token lleva `htid`.
- **Datos de tenant.** Tenants, membresías, grupos, roles, invitaciones, service accounts y API keys se enrutan con `ShardKey.Tenant`.
- **`ShardScope`.** `@platform/persistence` agrega `ShardScope.run({ tenantId, keyKind, keyValue }, fn)`, que el resolver usa antes que el contexto. Con `requireScope`, una consulta sin scope responde `PLATFORM.SHARDING.KEY_MISSING`. Identity lo activa.
- **Índices en el catálogo**, solo con datos de enrutamiento: `identity_lookup` (HMAC del email), `passkey_lookup` (hash de la credencial), `api_key_lookup` (prefijo) y `tenant_lookup` (slug).
- **Tokens opacos con ruta.** Session token, reset, verificación de email, `mfaToken`, `deviceId` firmado e invitación llevan los ids que ubican su shard. El secreto se guarda como HMAC.
- **Membresías.** La fuente de verdad está en el shard del tenant. `user_tenants`, en el shard del usuario, es una proyección. El caso de uso que cambia la membresía la proyecta después del commit, para que "mis tenants" vea el cambio enseguida, y el consumidor de `identity.membership.changed.v1` (cola `identity-access-projection`, publicado por el outbox en la misma transacción) la repara si el proceso cayó entre el commit y esa escritura. Proyectar es idempotente: lee la membresía vigente del shard del tenant.
- **RLS en las tablas de tenant.** Tenants, membresías, grupos, roles, versiones de permisos, invitaciones, service accounts y API keys tienen una política por `tenant_id` con `FORCE ROW LEVEL SECURITY`. `inTenantShard` pone el tenant del bloque en el contexto de la petición, así la persistencia lo fija en `app.tenant_id` al abrir la transacción aunque la sesión sea de otro tenant (aceptar una invitación, cambiar de tenant, las operaciones internas). Sin tenant en la sesión la política no filtra: las lecturas fuera de transacción y el mantenimiento entre shards ya filtran por su cuenta.
- **Registro.** Primero se reserva el email en `identity_lookup`, luego se crea el usuario en su shard y al final se activa la reserva. Un job borra reservas huérfanas.
- **API interna con `requireScope`.** El shard de una operación interna lo elige su handler con la entrada (el usuario y su tenant de origen, o el tenant), así que no se conoce antes de llamarlo. Para un servicio con `requireScope`, `PlatformRuntimeModule` guarda las llaves de idempotencia de la API interna en `idempotency_keys` del catálogo (`CatalogIdempotencyStore`) y corre el handler con `HandlerUnitOfWork.Handler`: el handler abre sus transacciones dentro de su `ShardScope` y el resultado se guarda aparte.

## Consecuencias

### Positivas

- Ninguna transacción toca dos shards ni el catálogo y un shard a la vez.
- Un tenant compartido con muchos clientes reparte sus usuarios en varios shards, como pide el plan.
- El refresh y los demás flujos con token llegan al shard sin leer el catálogo.

### Costos

- El tenant de origen no cambia; mover un usuario a otro tenant de origen es un traslado de datos.
- La proyección se escribe dos veces por cambio (en línea y por el consumidor); las dos escriben lo mismo.
- Mientras el runtime no entregue eventos con tenant a un servicio con `requireScope` (le falta un `TenantVerifier` y abrir el `ShardScope` del sobre), el consumidor solo corre donde se lo invoca; la proyección en línea cubre el caso normal.
- Los intentos con emails inexistentes no tienen shard: quedan en Valkey y en los logs.
- El resultado de una operación interna y sus efectos no se confirman en la misma transacción: si el proceso cae entre los dos, la llamada se repite al vencer la reserva de la llave. Por eso cada handler de identity es idempotente por su entrada (por ejemplo, crear un tenant por `tenantId`).

## Alternativas consideradas

- Un tenant ficticio por región para todos los usuarios: más simple, pero no reparte un tenant grande en su propio grupo.
- Membresías solo en el shard del usuario: listar los miembros de un tenant obligaría a consultar todos los shards.
- Buscar el tenant de origen en el catálogo en cada petición: una lectura global más por petición.
