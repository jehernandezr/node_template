# Traslado de un tenant

Mueve un tenant a otro grupo de shards, en la misma región o en otra, sin perder ni repetir escrituras. El diseño está en el [ADR 0032](../adr/0032-traslado-de-tenants-y-regiones.md).

## Antes

1. El grupo de destino está en `TENANT_MOVE_TARGETS` de los cinco servicios, con la región y el shard lógico de cada uno, y ese shard está registrado en el directorio del servicio (`shard_instances`).
2. Si el destino es otra región: `REGIONS` lista las dos regiones en todos los servicios, cada proceso declara su `SERVICE_REGION` y su `AUTH_ISSUER` es el `issuer` de su región. Identity no arranca si `REGIONS` declara regiones y falta `SERVICE_REGION`.
3. Las migraciones están aplicadas en los shards de destino (`pnpm nx run <servicio>:migrate -- shards`).
4. El tenant no tiene sagas a medias: `sync` espera a que terminen y `finalize` falla con `PLATFORM.TENANT_MOVE.TENANT_BUSY` si aparece una.
5. Con `TENANT_MOVE_STRATEGY=logical`, el origen tiene `wal_level=logical`, el rol del servicio puede crear suscripciones en el destino y el destino llega al origen por la red (`TENANT_MOVE_REPLICATION_HOST` y `_PORT` si no es la misma dirección).

## Lanzar

```bash
pnpm nx run identity:tenant-move -- --tenant=<id del tenant> --target=<grupo de destino>
```

El comando lanza la saga `MoveTenant` y la corre hasta terminar o pausarse; si se pausa, la retoma el worker de identity. Imprime el id del traslado.

## Seguir

- `tenant_moves` en el catálogo de identity: `Running`, `Switched`, `CleanedUp` o `Aborted`.
- La bitácora de la saga en el shard del tenant de plataforma (`saga.instances` y `saga.step_log`).
- Mientras dura la última ronda, las escrituras del tenant esperan hasta `TENANT_MOVE_MAX_WAIT_MS` y después responden `PLATFORM.SHARDING.TENANT_MIGRATING` con `Retry-After`.

Una ronda que no alcanza al origen responde `PLATFORM.TENANT_MOVE.ROUND_PENDING` y la saga la repite. Si un tenant escribe más rápido de lo que copia una ronda, sube `TENANT_MOVE_CAUGHT_UP_ROWS` o `TENANT_MOVE_CALL_BUDGET_MS` (cada llamada, con sus dos partes de copia, cabe en ese plazo).

## Si falla

- Antes del pivote, la saga compensa con `abort` en cada servicio: descarta la copia, baja la barrera del origen y abre la compuerta. El tenant sigue donde estaba y se puede lanzar otra vez.
- `PLATFORM.TENANT_MOVE.VERIFICATION_FAILED`: el destino no quedó igual al origen congelado. La saga compensa; revisa en el log las tablas que difirieron antes de repetir.
- Después del pivote, la saga repite `switch` hasta completarlo. Si queda en `RequiresIntervention`, revisa el servicio cuyo `switch` falla: mientras tanto su origen sigue vivo y su barrera frena las escrituras viejas.

## Limpieza

Pasados `TENANT_MOVE_GRACE_DAYS` (7 por defecto), `identity.clean-up-tenant-moves` pide a cada servicio que borre el origen. Repite cada servicio con una pausa de `TENANT_MOVE_CLEANUP_PAUSE_MS` mientras responda que su ronda sigue, hasta `TENANT_MOVE_CLEANUP_MAX_ATTEMPTS` intentos por corrida; lo que falte queda para la corrida siguiente. El traslado pasa a `CleanedUp` cuando los cinco terminan. `PLATFORM.TENANT_MOVE.NOT_SWITCHED` significa que el directorio de ese servicio todavía lleva al tenant al origen: no borres a mano, termina primero el `switch`.

## Qué no viaja

`outbox` y `audit_log` se quedan en el origen. Las llaves de idempotencia y los mensajes procesados anteriores a sus migraciones de `tenant_id` cubren solo hasta su TTL. El detalle está en el ADR 0032.
