# Ejemplos de mensajería

## Publicar en la transacción

`MessageBus.publish` escribe en el outbox con `OutboxWriter.append` dentro de la misma transacción.

```ts
await this.transactions.runInTransaction(async () => {
  await this.users.save(user);
  for (const event of user.pullDomainEvents()) {
    await this.bus.publish(
      UserRegisteredV1,
      this.integrationEvents.from(event),
    );
  }
});
```

## Consumidor con `@Subscribe`

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

## Handler de operación interna

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

## Jobs de la plataforma

- `OutboxRelayJob`: dueño: messaging; calendario: cada 1 s con jitter
- `OutboxRetentionJob`: dueño: messaging; calendario: cada hora
- `ProcessedMessageRetentionJob`: dueño: messaging; calendario: cada hora
- `ProcessedOperationRetentionJob`: dueño: internal-api; calendario: cada hora
- `SagaRecoveryJob`: dueño: saga; calendario: cada 5 s
- `SagaRetentionJob`: dueño: saga; calendario: cada hora
