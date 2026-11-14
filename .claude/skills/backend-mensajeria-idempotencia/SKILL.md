---
name: backend-mensajeria-idempotencia
description: Eventos, colas e idempotencia en el backend de node_template. Outbox transaccional, publicación después del commit, consumidores SNS/SQS con @Subscribe, tabla processed_messages, llaves de idempotencia en la API, versionado de eventos con contratos zod, DLQ y compensaciones de sagas. Úsala al publicar un evento, escribir un consumidor, exponer una operación que modifica datos o definir una operación de saga.
paths:
  - 'backend/**/messaging/**'
  - 'backend/libs/platform/messaging/**'
  - 'backend/libs/platform/saga/**'
  - 'backend/libs/platform/internal-api/**'
  - 'backend/libs/contracts/**/events/**'
---

# Mensajería e idempotencia

Referencias: ADR 0007 (mensajería tipada, CloudEvents), ADR 0008 (sagas). La entrega es al menos una vez: todo consumidor y toda operación que modifica datos tolera duplicados.

## Publicar: outbox transaccional

- El caso de uso guarda el cambio y los eventos en la misma transacción (`OutboxWriter`). Un barrido periódico los publica después del commit y los marca como enviados.
- Nunca se publica a SNS dentro del caso de uso, ni antes del commit, ni en `afterCommit` sin outbox si perder el evento es inaceptable.
- Los eventos salen del agregado con `pullDomainEvents()`. Un mapper de aplicación los traduce a eventos de integración (contrato zod en `@contracts/<servicio>/events`).
- Tipo y cola salen de enums de la topología (`TopicDef`, `QueueDef`, `Route`). Sin literales.
- El outbox guarda `traceparent`, `tenantid` y `actorid` para continuar la traza y el contexto.

```ts
await this.transactions.runInTransaction(async () => {
  await this.users.save(user);
  await this.outbox.add(
    user.pullDomainEvents().map((event) => this.integrationEvents.from(event)),
  );
});
```

## Eventos como contrato

- CloudEvents 1.0 con tipo versionado: `identity.user.registered.v1`.
- Cambio compatible (campo opcional nuevo): se mantiene la versión. Cambio incompatible: se publica `v2` en paralelo hasta que los consumidores migren, y se retira `v1` después.
- Un consumidor ignora campos desconocidos. Un productor nunca elimina ni cambia el significado de un campo de una versión publicada.
- El evento lleva el estado necesario para el consumidor, o solo el id si consultarlo es barato y seguro. Sin datos personales innecesarios.
- Un cambio en `backend/libs/contracts` regenera el Dart del front en el mismo cambio.

## Consumir

- `@Subscribe` en un consumidor de `presentation/`. Valida el sobre y el esquema zod antes de hacer nada. Un mensaje inválido es permanente: va a la DLQ, no se reintenta.
- Idempotencia con `processed_messages`: el consumidor verifica y registra el id del mensaje en la misma transacción que sus efectos. Si ya existe, confirma el mensaje y no hace nada.

```ts
async handle(message: UserRegisteredV1): Promise<void> {
  await this.transactions.runInTransaction(async () => {
    if (!(await this.processed.tryRegister(message.id, ConsumerName.WelcomeEmail))) return;
    await this.sendWelcome.execute({ userId: message.data.userId });
  });
}
```

- El orden no está garantizado. El consumidor no asume que llega `Updated` después de `Created`: usa la versión o el instante del evento para descartar el obsoleto.
- Errores: `Permanent` a la DLQ; `Transient` se reintenta con `base * 2^intento + jitter` (lo calcula la plataforma). Todo lo que cae a DLQ tiene alerta y procedimiento de reproceso.
- Concurrencia acotada por consumidor. El tiempo de visibilidad supera el tiempo máximo de procesamiento.
- Un consumidor nunca llama a un caso de uso que vuelva a escribir en la misma cola de forma cíclica sin condición de parada.

## Idempotencia en la API

- Una operación que modifica datos y puede reintentarse (pagos, altas, sagas) recibe una llave de idempotencia (`Idempotency-Key` en HTTP, `sagaId:paso:dirección` en la API interna).
- El resultado se guarda con la misma transacción que los efectos. Una repetición con la misma llave y la misma entrada devuelve el resultado guardado. Con la misma llave y distinta entrada responde 409 o 422.
- Operaciones naturalmente idempotentes (`PUT` de un estado, borrar si existe) no necesitan llave, pero su caso de uso se escribe para que repetirlo sea inocuo.
- Las llaves caducan (por ejemplo, 24 horas) y la limpieza es un job.

## Sagas

- Toda operación interna que modifica datos declara su compensación (`compensatedBy`) en el contrato, o `Compensation.None` si queda después del pivote.
- Después del pivote, la operación es `idempotent: true`.
- Un paso se reintenta con la misma llave y la misma entrada registrada. Nunca con una reconstruida.
- Un `BusinessError` antes del pivote inicia compensación. Un `TransientFailure` suspende y reintenta.
- La compensación también es idempotente y tolera que el paso nunca se haya aplicado.

## Pruebas

- Dominio y mapper de eventos: unitarias.
- Outbox y consumidor: integración con PostgreSQL y LocalStack. Casos obligatorios: evento duplicado, evento fuera de orden, mensaje inválido a DLQ, falla de la base a mitad del consumidor.
- Contrato: el esquema del evento publicado se valida contra el del consumidor.
