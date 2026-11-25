# Operación de los servicios

Los cinco servicios de la plantilla (identity, tasks, notifications, reports y billing) comparten el runtime de `@platform/service`, así que se operan igual. Este runbook dice qué mirar y qué hacer en cada caso.

## Procesos

Cada servicio tiene tres entradas, construidas en `backend/dist/<servicio>`:

| Entrada       | Qué corre                                                                         | Comando local                    |
| ------------- | --------------------------------------------------------------------------------- | -------------------------------- |
| `main.mjs`    | La API pública y la interna                                                       | `pnpm nx run <servicio>:serve`   |
| `worker.mjs`  | Los consumidores de SQS, el relay del outbox, la recuperación de sagas y los jobs | `pnpm nx run <servicio>:worker`  |
| `migrate.mjs` | Las migraciones del catálogo y de cada shard (`catalog`, `shards` o `all`)        | `pnpm nx run <servicio>:migrate` |

En AWS las migraciones corren como tarea antes de desplegar la versión nueva; una migración que falla detiene el despliegue.

La siembra de identity (`pnpm nx run identity:seed`) crea los tenants fijos de la región y los anota en el directorio de tasks, notifications, reports y billing, así que corre después de desplegarlos. Es idempotente: si falla porque un servicio no responde, se repite cuando responda. Un tenant que exista desde antes de que los servicios ubicaran tenants se anota llamando `<servicio>.tenant-directory.place.v1` con su región y sus grupos de shards.

## Salud

- `GET /health/live`: el proceso responde. Si falla, el orquestador reinicia la tarea.
- `GET /health/ready`: el catálogo y cada shard responden. Una tarea que no está lista sale del balanceador sin reiniciarse.

Si `ready` falla en todas las tareas, revisa primero el RDS Proxy y las credenciales (`DB_CREDENTIALS`), después Valkey.

## Jobs

Los jobs son `ScheduledJob` y los corre `@platform/scheduling` con candado en Valkey, así que cada uno corre en una sola tarea a la vez.

| Servicio      | Job                                                                                                                                | Qué hace                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| identity      | `identity.clean-up-tenant-moves`                                                                                                   | Borra el origen de los traslados pasada la gracia             |
| identity      | `identity.rotate-login-attempt-partitions`                                                                                         | Crea y borra particiones de intentos de login                 |
| identity      | `identity.expire-invitations`, `identity.purge-password-resets`, `identity.sweep-reserved-lookups`, `identity.flush-api-key-usage` | Mantenimiento de identity                                     |
| tasks         | `tasks.purge-deleted`                                                                                                              | Borra las tareas eliminadas pasada su retención               |
| notifications | `notifications.retry-deliveries`                                                                                                   | Reintenta las entregas de correo y push que fallaron          |
| notifications | `notifications.purge-read`                                                                                                         | Borra las notificaciones leídas viejas                        |
| reports       | `reports.expire-runs`                                                                                                              | Vence los resultados de las ejecuciones                       |
| reports       | `reports.backfill-projections`                                                                                                     | Rellena las proyecciones desde los cambios de tasks y billing |
| billing       | `billing.close-invoice-periods`                                                                                                    | Cierra los periodos y emite las facturas                      |
| billing       | `billing.advance-dunning`                                                                                                          | Avanza la morosidad de las facturas fallidas                  |

Todos los servicios corren además el relay del outbox, la retención del outbox y de `processed_messages`, y `SagaRecoveryJob` si orquestan sagas. Un job que no corre suele ser un candado retenido en Valkey por una tarea muerta: el candado vence solo con su lease; no lo borres a mano salvo que la tarea dueña ya no exista.

## Colas y DLQ

Cada cola de `topology.json` tiene su DLQ. Un mensaje llega a la DLQ cuando su manejador falló con un error no reintentable o agotó los intentos.

1. Lee el mensaje de la DLQ y busca su `traceid` en OpenObserve: el log del consumidor dice el código del error.
2. Si el error era transitorio (una dependencia caída), redirige la DLQ a su cola con la consola de SQS o `aws sqs start-message-move-task`. El consumidor lo procesa una sola vez: `processed_messages` reconoce un mensaje ya completado.
3. Si el error era de contenido (`PLATFORM.MESSAGING.INVALID_ENVELOPE`, `IDEMPOTENCY_CONFLICT`), no lo redirijas: corrige el productor y descarta el mensaje.

## Sagas

Una saga en `Suspended` se retoma sola. Una en `RequiresIntervention` necesita a una persona: revisa en la bitácora (`saga.instances` y `saga.step_log` del shard del tenant) el paso que falló y su código, corrige la causa y reanúdala o compénsala desde el backoffice.

## Errores frecuentes

| Código                               | Qué significa                                                 | Qué hacer                                                                            |
| ------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `PLATFORM.SHARDING.TENANT_MIGRATING` | El tenant está en un traslado; la escritura esperó y no entró | Nada: el cliente reintenta con `Retry-After`. Si dura, revisa el traslado            |
| `PLATFORM.SHARDING.WRONG_REGION`     | El tenant vive en otra región                                 | El front reintenta solo contra `details.apiBaseUrl`; revisa `REGIONS` si no trae URL |
| `PLATFORM.SHARDING.UNKNOWN_TENANT`   | El directorio del servicio no tiene al tenant                 | Revisa que la siembra de identity haya corrido y que el alta del tenant terminó      |
| `PLATFORM.SHARDING.KEY_MISSING`      | Una consulta corrió sin tenant ni llave de shard              | Es un error de programación: corrige el caso de uso                                  |
| `BILLING.QUOTA.EXCEEDED`             | El tenant llegó al límite de su plan                          | El tenant cambia de plan; soporte puede revisar el uso en billing                    |

## Configuración

Cada servicio valida su configuración al arrancar y no arranca con un valor inválido; el log dice la variable. Las variables comunes están en `backend/.env.example`. Las de los traslados (`TENANT_MOVE_*`, `TENANT_WRITE_GATE`) y las regiones (`REGIONS`, `SERVICE_REGION`) se describen en el [traslado de un tenant](traslado-de-tenant.md).
