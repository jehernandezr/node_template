# 0035. Flujo de punta a punta de la plataforma

- Estado: Aceptada
- Fecha: 2026-11-24
- Relacionados: [ADR 0008](0008-sagas-orquestadas-bitacora-persistente.md), [ADR 0010](0010-sharding-logico-residencia-region.md), [ADR 0031](0031-reportes-facturacion-y-sagas-de-identity.md), [ADR 0032](0032-traslado-de-tenants-y-regiones.md)

## Contexto

Cada servicio prueba sus rutas, sus consumidores y sus sagas con los demás servicios simulados. F5 a F11 terminan cuando el flujo de punta a punta pasa dos veces seguidas: el alta de un tenant, su trabajo en cada servicio, la factura y el traslado, con los cinco servicios reales hablando entre sí. Hacía falta decidir cómo levantarlos juntos sin LocalStack ni contenedores por servicio, y qué afirma la prueba en cada paso.

## Decisión

- **Un proceso, bases reales.** `backend/e2e/platform-flow` (target `platform-flow:e2e`, en CI con `nx affected -t e2e`) arranca identity, tasks, notifications, reports y billing en un proceso, sobre un PostgreSQL con un catálogo y dos shards por servicio y un Valkey de Testcontainers. Es el único proyecto que importa apps, y solo por `@apps/<servicio>/test-utils`.
- **Mensajería en memoria, API interna por HTTP.** Los une un bus en memoria: el relay de cada outbox publica en él (`BusEnvelopePublisher`) y cada cola se entrega al despachador del servicio que la declara. La API interna va por HTTP firmado entre los cinco, sin intermediarios.
- **Sin simular pasos de la plataforma.** Cada servicio arranca con su propia configuración (bases, `TENANT_MOVE_TARGETS` con los dos grupos de shards, URLs de los demás) y nada escribe en sus bases por fuera de sus operaciones: los tenants llegan al directorio de cada servicio por la siembra de identity y por la saga de alta ([ADR 0032](0032-traslado-de-tenants-y-regiones.md)).
- **Jobs a mano.** Los jobs no corren solos (`SchedulingMode.External`): la prueba publica los outbox y entrega los mensajes hasta que nada queda en camino, y cierra los periodos de billing con su job.
- **Qué afirma.** Recorre el alta de un tenant con `TenantOnboarding` (y comprueba que los cinco directorios lo ubican en el mismo grupo), la invitación de un miembro, tareas creadas y completadas, el aviso en la bandeja del autor, el reporte de tareas por estado sobre la proyección, la factura del periodo y el traslado del tenant al otro grupo con `MoveTenant`. Del traslado guarda antes el shard de origen de cada servicio, y después afirma que el directorio de cada uno apunta al shard del grupo destino, que las filas de cada tabla leídas directamente en ese shard son las de antes y que el origen de cada servicio quedó con la barrera del traslado marcada como pivotada.
- **En CI sin Docker falla.** El paso corre con `INTEGRATION_TESTS=require`, así una máquina sin Docker no lo da por bueno con cero pruebas.

## Consecuencias

### Positivas

- Un paso de la plataforma que falte entre servicios (un directorio sin el tenant, una cola sin consumidor, un `switch` que no corrió) rompe la prueba.
- Corre en una Raspberry Pi y en el tiempo de CI.

### Costos

- No ejercita SNS ni SQS: eso queda en las pruebas de integración de `@platform/adapters-aws`.
- Los cinco servicios comparten un proceso y un Valkey; un problema que solo aparece con procesos separados no se ve aquí.

## Alternativas descartadas

- Levantar los cinco servicios compilados con LocalStack: no cabe en una Raspberry Pi ni en el tiempo de CI y prueba el mismo flujo de negocio.
- Comprobar el traslado leyendo cada servicio por su propio directorio: pasaría aunque un servicio no hubiera hecho `switch`.
