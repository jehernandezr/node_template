# 0008. Sagas orquestadas con bitácora persistente

- Estado: Aceptada
- Fecha: 2026-11-11

## Contexto

Algunas operaciones cruzan varios servicios: el alta de un tenant, el borrado de una cuenta en todos los servicios y el traslado de un tenant entre shards. Si el proceso se cae a mitad de camino, la operación no puede quedar a medias ni duplicar efectos.

## Decisión

`libs/platform/saga` coordina las operaciones con una bitácora persistente en la base del servicio que orquesta, en las tablas `saga_instances` y `saga_step_log`.

- Cada paso se registra como `Dispatched` con la llave `sagaId:paso:dirección` antes de llamar al servicio destino. Después se guarda el resultado en otra transacción.
- Quien ejecuta una saga toma un lease de 30 segundos. `SagaRecoveryJob` corre cada minuto y al arrancar, con `FOR UPDATE SKIP LOCKED`, y retoma las sagas con lease vencido.
- Los pasos antes de `pivot()` tienen compensación. Los pasos después son idempotentes y se reintentan hasta completar.
- Las compensaciones salen del `compensatedBy` del contrato de cada operación. Renombrar una operación rompe la compilación.
- Un `BusinessError` inicia la compensación. Un `TransientFailure` deja la saga en `Suspended` hasta que se resuelva.

## Consecuencias

Positivas:

- Una saga retomada desde la bitácora termina en el mismo punto, incluidas las compensaciones a medio camino.
- Cada efecto ocurre una vez, porque el servicio destino reconoce la llave de idempotencia.

Costos:

- Cada paso necesita una reversa declarada, y al arrancar se valida que exista.
- `CompensationFailed` exige intervención manual desde el backoffice.
- Mientras una saga corre, el recurso queda en un estado intermedio (por ejemplo, tenant `Provisioning`) que el dominio debe contemplar.

## Alternativas consideradas

- Coreografía por eventos: el documento la mantiene para los flujos simples que no necesitan deshacer nada.
