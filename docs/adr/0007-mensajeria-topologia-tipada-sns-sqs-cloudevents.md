# 0007. Mensajería con topología tipada, SNS/SQS y CloudEvents

- Estado: Aceptada
- Fecha: 2026-11-11

## Contexto

Los servicios necesitan publicar eventos y enviar comandos sin acoplarse a un broker. Hace falta reintentar con backoff real, aislar mensajes que fallan y que los mensajes sean entendibles por consumidores externos.

## Decisión

`libs/platform/messaging` despacha eventos y comandos. La topología tipada, con `TopicDef`, `QueueDef` y `Route`, es la única fuente de verdad. De ella salen el despacho en ejecución, la infraestructura (Terraform), el entorno local, las pruebas y la documentación (AsyncAPI).

- Adaptador AWS: SNS para tópicos y SQS para colas, con una cola por consumidor.
- Formato: CloudEvents 1.0 con tipos como `tasks.task.updated.v1`, y atributos `traceparent`, `tenantid` y `actorid`.
- Reintentos: el dispatcher calcula `base · 2^intento + jitter` y lo aplica con `ChangeMessageVisibility`. Los errores permanentes van directo a la DLQ. Una cola usa por defecto 10 intentos, que con 1 s de base y 5 min de tope cubren varios minutos de una caída. Una falla de infraestructura del consumidor (el claim o su cierre no llegan a la base) se reintenta siempre y no cuenta contra los intentos; `maxReceiveCount` es por defecto diez veces los intentos, porque SQS cuenta también esas recepciones y las reentregas de un mensaje en curso. Los errores del handler se clasifican con el `FailureClassifier` del servicio, que reconoce los SQLSTATE pasajeros de Postgres.
- Outbox: el evento se guarda en la misma transacción del cambio y se publica después del commit. `Dead` queda para lo que nunca se podrá entregar (sin ruta, demasiado grande o fuera de contrato). Una falla de transporte se reintenta sin límite con la espera de la política, con tope en `maxMs`, y el rechazo de un circuit breaker abierto no cuenta como intento. Cada pasada publica su informe como contadores (`messaging.outbox.published`, `failed`, `dead`, `deferred` y `stale`) para alarmar, y un registro muerto se anota como error.
- Consumidores con `@Subscribe`. Cada uno valida el esquema y revisa idempotencia en `processed_messages`.

## Consecuencias

Positivas:

- Cambiar de broker significa cambiar el adaptador, no el negocio.
- Terraform y el entorno local salen de la misma declaración que el código.
- El backoff exponencial queda en la plataforma, porque SQS solo reintenta con intervalo fijo.

Costos:

- La topología es código que debe mantenerse sincronizado. Al arrancar se valida que cada ruta apunte a un tópico o cola declarado.
- El outbox agrega una tabla y un barrido periódico.
- Un registro `Dead` no bloquea a su grupo FIFO: no se va a entregar nunca y frenaría para siempre a los que siguen. No hay comando de reenvío, porque reenviar sin cambios un registro que no tiene ruta o rompe el contrato falla igual; se corrige a mano.
- Las alarmas sobre los contadores del outbox se declaran con la infraestructura de observabilidad del despliegue.
- Cada consumidor debe mantener su tabla de idempotencia.

## Alternativas consideradas

- Tópicos en Google Pub/Sub o Kafka.
- Colas en RabbitMQ, o en BullMQ sobre Valkey para desarrollo.
- Consulta síncrona por API interna (`TasksOperation.GetTaskSummary`) cuando se necesita un dato inmediato que no conviene copiar.
