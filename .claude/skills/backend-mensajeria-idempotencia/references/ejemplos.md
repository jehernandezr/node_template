# Messaging examples

## Publishing in the transaction

`MessageBus.publish` writes to the outbox with `OutboxWriter.append` inside the same transaction.

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

## Consumer with `@Subscribe`

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

## Internal operation handler

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

## Platform jobs

- `OutboxRelayJob`: owner: messaging; schedule: every 1 s with jitter
- `OutboxRetentionJob`: owner: messaging; schedule: every hour
- `ProcessedMessageRetentionJob`: owner: messaging; schedule: every hour
- `ProcessedOperationRetentionJob`: owner: internal-api; schedule: every hour
- `SagaRecoveryJob`: owner: saga; schedule: every 5 s
- `SagaRetentionJob`: owner: saga; schedule: every hour
