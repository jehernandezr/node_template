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

- El caso de uso publica con `MessageBus.publish(event, data)` o `send(command, data)` dentro de `runInTransaction`: `OutboxMessageBus` guarda el mensaje con `OutboxWriter.append` en la misma transacción y, si no hay una abierta, lanza un `MessagingError` con el código `MessagingTransactionRequired`. `OutboxRelayJob` (un `ScheduledJob` de messaging, cada 1 s con jitter) lo publica después del commit y lo marca como enviado.
- Nunca se publica a SNS dentro del caso de uso, ni antes del commit, ni en `afterCommit` sin outbox si perder el evento es inaceptable.
- Los eventos salen del agregado con `pullDomainEvents()`. Un mapper de aplicación los traduce a eventos de integración (contrato zod en `@contracts/<servicio>/events`).
- Tipo y cola salen de enums de la topología (`TopicDef`, `QueueDef`, `Route`). Sin literales.
- El outbox guarda `traceparent`, `tenantid` y `actorid` para continuar la traza y el contexto.

```ts
await this.transactions.runInTransaction(async () => {
  await this.users.save(user);
  // MessageBus.publish escribe en el outbox con OutboxWriter.append, en esta misma transacción
  for (const event of user.pullDomainEvents()) {
    await this.bus.publish(
      UserRegisteredV1,
      this.integrationEvents.from(event),
    );
  }
});
```

## Eventos como contrato

- CloudEvents 1.0 con tipo versionado: `identity.user.registered.v1`.
- Cambio compatible (campo opcional nuevo): se mantiene la versión. Cambio incompatible: se publica `v2` en paralelo hasta que los consumidores migren, y se retira `v1` después.
- Un consumidor ignora campos desconocidos. Un productor nunca elimina ni cambia el significado de un campo de una versión publicada.
- El evento lleva el estado necesario para el consumidor, o solo el id si consultarlo es barato y seguro. Sin datos personales innecesarios.
- Un cambio en `backend/libs/contracts` regenera el Dart del front en el mismo cambio.

## Consumir

- Un consumidor es una clase de `presentation/` con un método decorado con `@Subscribe(Contrato)`. `MessagingExplorer` lo descubre y lo registra en `MessageDispatcher`. El dispatcher valida el sobre y el esquema zod antes de llamar al método; un mensaje inválido es permanente: va a la DLQ, no se reintenta.
- La idempotencia la hace el `MessageDispatcher`, no el consumidor: toma un claim de tres estados del `IdempotencyStore` (`ProcessedMessageStore`) con la llave `(consumidor, id del mensaje)`. `claim` responde `ClaimState.Acquired`, `ClaimState.InProgress` o `ClaimState.Completed`: si otro reparto está en curso deja el mensaje para reentrega y si ya está completado lo confirma sin ejecutar. `complete` corre en la misma transacción que los efectos del manejador (`runInContext`) y `release` si el manejador falla. El consumidor no registra ids a mano.
- Un servicio con `requireScope` (sus datos viven en shards y cada transacción declara su `ShardScope`) entrega cada mensaje en el shard del tenant del sobre: `PlatformRuntimeModule` registra `PlacedTenantVerifier` (solo acepta tenants que el directorio ubica en la región; un sobre sin tenant o con uno desconocido va a la DLQ) y `TenantShardDeliveryContext` (abre el `ShardScope` y el contexto del tenant alrededor del claim, el manejador y el `complete`). Ese contexto no abre transacción, porque el manejador puede tocar otros shards: los efectos y el `complete` no se confirman juntos, y el consumidor tiene que ser idempotente por su entrada (reaplicar el mismo mensaje no duplica nada). Un servicio sin shards no cambia: `processed_messages` se confirma con los efectos.

```ts
@Injectable()
export class WelcomeEmailConsumer {
  constructor(private readonly sendWelcome: SendWelcomeEmail) {}

  @Subscribe(UserRegisteredV1)
  async onUserRegistered(
    data: UserRegisteredV1Data,
    envelope: MessageEnvelope<UserRegisteredV1Data>,
  ): Promise<void> {
    await this.sendWelcome.execute({
      userId: data.userId,
      tenantId: envelope.tenantId,
    });
  }
}
```

- El orden no está garantizado. El consumidor no asume que llega `Updated` después de `Created`: usa la versión o el instante del evento para descartar el obsoleto.
- Errores: `Permanent` a la DLQ; `Transient` se reintenta con `base * 2^intento + jitter` (lo calcula la plataforma). Todo lo que cae a DLQ tiene alerta y procedimiento de reproceso.
- Concurrencia acotada por consumidor. El tiempo de visibilidad supera el tiempo máximo de procesamiento.
- Un consumidor nunca llama a un caso de uso que vuelva a escribir en la misma cola de forma cíclica sin condición de parada.
- Un handler de operación interna es una clase con un método `@InternalHandler(Operacion)` que `InternalApiModule` registra en el router; un servicio con una operación sin handler no arranca (`assertComplete`).

```ts
@Injectable()
export class CreateTenantHandler {
  @InternalHandler(CreateTenantOperation)
  handle(
    input: CreateTenantInput,
    call: CallContext,
  ): Promise<CreateTenantOutput> {
    /* ... */
  }
}
```

## Idempotencia en la API

- Una operación que modifica datos y puede reintentarse (pagos, altas, sagas) recibe una llave de idempotencia (`Idempotency-Key` en HTTP, `sagaId:paso:dirección` en la API interna).
- El resultado se guarda con `IdempotencyGate`, que hace `claim`, `complete` y `release` sobre `ProcessedOperationStore`, y `UnitOfWorkRunner` confirma el manejador y el `complete` en una sola transacción. Una repetición con la misma llave y la misma entrada devuelve el resultado guardado. Con la misma llave y distinta entrada responde 409 o 422.
- Excepción, servicios con `requireScope` (ADR 0023): el shard de la operación lo decide su handler con la entrada, así que la llave vive en el catálogo (`CatalogIdempotencyStore`) y el handler abre sus propias transacciones (`HandlerUnitOfWork.Handler`). El `complete` no se confirma con los efectos: si el proceso cae entre los dos, la reintentada vuelve a correr el handler. Por eso cada operación que modifica datos de ese servicio es idempotente por su entrada (la misma entrada con otra llave no duplica efectos ni eventos), y una prueba de integración por operación la invoca dos veces con llaves distintas y verifica sus efectos y su outbox.
- Operaciones naturalmente idempotentes (`PUT` de un estado, borrar si existe) no necesitan llave.
- Las llaves caducan (por ejemplo, 24 horas) y la limpieza es `ProcessedOperationRetentionJob`, un `ScheduledJob` que corre cada hora.

## Sagas

- Toda operación interna que modifica datos declara su compensación (`compensatedBy`) en el contrato, o `Compensation.None` si queda después del pivote.
- Después del pivote, la operación es `idempotent: true`.
- Un paso se reintenta con la misma llave y la misma entrada registrada. Nunca con una reconstruida.
- Un `BusinessError` antes del pivote inicia compensación. Un `TransientFailure` suspende y reintenta.
- La compensación también es idempotente y tolera que el paso nunca se haya aplicado.
- La bitácora la guarda `TypeOrmSagaStore` en la base del servicio que orquesta y `SagaRecoveryJob` retoma cada 5 segundos las sagas con lease vencido.

## Jobs

- Toda tarea periódica es una clase que extiende `ScheduledJob` del kernel: `name` (valor de un enum de la librería dueña), `schedule`, `exclusive`, `timeoutMs` y `run(context)`. La corre `JobRunner` de `@platform/scheduling`, que la descubre entre los providers, y se prueba llamando a `run()` directamente.
- `exclusive: true` exige un `JobLock` compartido (`ValkeyJobLock`) para que un solo proceso la corra a la vez.

| Job                              | Dueño        | Calendario          |
| -------------------------------- | ------------ | ------------------- |
| `OutboxRelayJob`                 | messaging    | cada 1 s con jitter |
| `OutboxRetentionJob`             | messaging    | cada hora           |
| `ProcessedMessageRetentionJob`   | messaging    | cada hora           |
| `ProcessedOperationRetentionJob` | internal-api | cada hora           |
| `SagaRecoveryJob`                | saga         | cada 5 s            |
| `SagaRetentionJob`               | saga         | cada hora           |

## Pruebas

- Dominio y mapper de eventos: unitarias.
- Outbox y consumidor: integración con PostgreSQL y LocalStack. Casos obligatorios: evento duplicado, evento fuera de orden, mensaje inválido a DLQ, falla de la base a mitad del consumidor.
- Servicio con `requireScope`: un consumidor se prueba de punta a punta por el `MessageDispatcher` con el sobre real del outbox (el claim cae en el shard del tenant, la reentrega es `Duplicate`), y cada operación interna que modifica datos con dos llaves para la misma entrada.
- Contrato: el esquema del evento publicado se valida contra el del consumidor.
- Los dobles (`InMemoryBus`, `InMemoryOutboxStore`, `InMemoryProcessedMessageStore`) salen de `@platform/messaging/test-utils` y pasan `runOutboxStoreContract` y `runProcessedMessageStoreContract`, igual que los stores reales.

## Con pstack

Carga primero `pstack-en-node-template`: dice cómo se lee una skill de pstack en Claude Code y qué regla manda cuando pstack y el repositorio no coinciden. Si el plugin no está instalado, esta sección no aplica.

- `principle-make-operations-idempotent` para consumidores, operaciones internas, pasos de saga y jobs: el mismo estado final sin importar reintentos ni caídas a mitad de camino.
- `principle-separate-before-serializing-shared-state` para claims, leases y outbox: eliminar el estado compartido antes de serializarlo.
- Sagas y protocolos con muchos estados: `statechart`. Carreras de outbox, claims o reentregas que las pruebas no alcanzan: `create-formal-verification-skill`.
- Al revisar un cambio de mensajería: `interrogate` con escenarios de caída concretos (entre escribir y publicar, reentrega, failover corto).
