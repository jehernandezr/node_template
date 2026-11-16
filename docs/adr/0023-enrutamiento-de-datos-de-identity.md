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
- **Membresías.** La fuente de verdad está en el shard del tenant. `user_tenants`, en el shard del usuario, es una proyección que actualiza un consumidor de `identity.membership.changed.v1` publicado por el outbox.
- **Registro.** Primero se reserva el email en `identity_lookup`, luego se crea el usuario en su shard y al final se activa la reserva. Un job borra reservas huérfanas.

## Consecuencias

### Positivas

- Ninguna transacción toca dos shards ni el catálogo y un shard a la vez.
- Un tenant compartido con muchos clientes reparte sus usuarios en varios shards, como pide el plan.
- El refresh y los demás flujos con token llegan al shard sin leer el catálogo.

### Costos

- El tenant de origen no cambia; mover un usuario a otro tenant de origen es un traslado de datos.
- La lista "mis tenants" se actualiza con unos segundos de retraso.
- Los intentos con emails inexistentes no tienen shard: quedan en Valkey y en los logs.

## Alternativas consideradas

- Un tenant ficticio por región para todos los usuarios: más simple, pero no reparte un tenant grande en su propio grupo.
- Membresías solo en el shard del usuario: listar los miembros de un tenant obligaría a consultar todos los shards.
- Buscar el tenant de origen en el catálogo en cada petición: una lectura global más por petición.
