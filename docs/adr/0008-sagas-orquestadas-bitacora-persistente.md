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
- El servicio destino guarda el resultado de cada llamada en la misma unidad de trabajo que sus efectos: `InternalRouter` recibe el `TransactionManager` del servicio (`transactions`) y ejecuta el manejador y `processed.complete` en una sola transacción. Si guardar el resultado falla, los efectos se deshacen y el reintento los aplica una vez.

### Pasos desde los contratos

`flow.step()` recibe el `OperationDefinition` que el servicio publica con `defineOperation` en `backend/libs/contracts/<servicio>`. Los tipos de entrada y salida salen de sus esquemas zod y la compensación sale de su `compensatedBy`:

- Una operación con `Compensation.None` o de solo lectura (`mutating: false`) no tiene compensación.
- Antes del pivote, un paso que modifica datos necesita compensación; con `Compensation.None` tiene que ir después del pivote. Un paso de solo lectura puede ir antes y se salta al compensar, porque no hay nada que deshacer.
- Después del pivote, la operación tiene que ser `idempotent: true`.

`OperationRef`, la referencia escrita a mano con `id` y `compensatedBy`, sigue funcionando marcada `@deprecated`.

### Validación al arrancar

`SagaEngine` compila todas las definiciones en su constructor, no con la primera saga de cada tipo, y falla con `PLATFORM.SAGA.INVALID_DEFINITION` si encuentra un problema:

- La llave del registro de sagas es igual al `type` de la definición.
- Con el catálogo de operaciones (`contracts`, o el del cliente cuando el invocador es `InternalClientInvoker`), cada operación y su reversa están registradas, la compensación de cada paso coincide con el `compensatedBy` del contrato, y los pasos después del pivote y las compensaciones son idempotentes.
- El presupuesto por defecto de cada llamada (`defaultCallBudgetMs`: intentos, timeouts y esperas entre intentos) cabe en `maxStepDurationMs`. Si no cabe, el último intento quedaría siempre incierto.

`engine.validate()` devuelve la lista de problemas (`SagaDefinitionIssue`) sin lanzar.

### Entrada inválida

El cliente de la API interna y el servidor responden igual a una entrada que no cumple el contrato: `BusinessError` con `PLATFORM.VALIDATION.INVALID_INPUT` y `details.fieldErrors`. El cliente no llama al transporte. Para la saga el paso no se aplicó, así que compensa desde el paso anterior.

### Traza

La saga guarda el `traceparent` en su instancia. Si quien la inicia no lo pasa, toma el del span activo, así la saga continúa la traza de la petición que la creó. Cada intento de paso corre en un span `saga.step`, hijo de esa traza, y la bitácora guarda el `traceparent` del paso al registrarlo como `Dispatched`. Un reintento, también desde otro nodo después de una caída, restaura ese `traceparent`. El cliente de la API interna lo envía en `CallMeta.traceparent` y el servidor continúa esa traza, porque la llamada viene de otro servicio de la plataforma.

### Resultado incierto

Un paso tiene resultado incierto cuando la llamada termina sin saber si el servicio destino aplicó el efecto. `SagaEngine` (`backend/libs/platform/saga`) da a cada llamada un plazo de `maxStepDurationMs` (25 segundos por defecto). Si el plazo se cumple, aborta la señal de la llamada y el resultado es `uncertain` (`CallOutcomeKind.Uncertain` de `@platform/primitives`). Lo mismo pasa cuando la llamada devuelve `uncertain` o lanza un error que `classifyFailure` clasifica como `Timeout` o `Cancelled`.

El motor registra el paso como `Uncertain` en la bitácora y deja la saga en `Suspended` con el código `PLATFORM.SAGA.UNCERTAIN_OUTCOME`. El catálogo de plataforma lo declara interno, reintentable y con estado 504.

La recuperación sigue estas reglas:

- `SagaRecoveryJob` retoma la saga cuando se cumple `nextAttemptAt`. La espera crece de forma exponencial desde 1 segundo hasta 60 segundos.
- El reintento usa la misma llave `sagaId:paso:dirección` y la entrada registrada en la bitácora, nunca una entrada reconstruida. El servicio destino reconoce la llave y el efecto ocurre una vez.
- Antes del pivote, si ya pasó el plazo de la saga (`deadlineMs` al iniciarla), el motor no vuelve a llamar: compensa desde el paso incierto, incluido. La compensación tolera que el paso nunca se haya aplicado.
- Una compensación con resultado incierto también queda en `Suspended` y se reintenta igual.
- Cuando los intentos fallidos superan 20 o la suspensión llega a 24 horas (`maxSuspendAttempts` y `maxSuspendAgeMs`), la saga pasa a `RequiresIntervention` y una persona decide.
- El lease (`leaseMs`) tiene que ser mayor que `maxStepDurationMs`; el motor rechaza la configuración si no lo es. Así ningún otro nodo retoma la saga mientras la llamada sigue dentro de su plazo.

## Consecuencias

Positivas:

- Una saga retomada desde la bitácora termina en el mismo punto, incluidas las compensaciones a medio camino.
- Cada efecto ocurre una vez, porque el servicio destino reconoce la llave de idempotencia.

Costos:

- Cada paso necesita una reversa declarada, y al arrancar se valida que exista y sea idempotente.
- Una operación lenta (timeouts largos o muchos intentos) no cabe en una saga sin subir `maxStepDurationMs` y `leaseMs`.
- `CompensationFailed` exige intervención manual desde el backoffice.
- Mientras una saga corre, el recurso queda en un estado intermedio (por ejemplo, tenant `Provisioning`) que el dominio debe contemplar.

## Alternativas consideradas

- Coreografía por eventos: el documento la mantiene para los flujos simples que no necesitan deshacer nada.
