# backend-nestjs-composicion examples

Long examples the skill cites. Read them only when the topic applies to you.

## Tokens for ports

```ts
@Module({
  providers: [
    SignInUseCase,
    { provide: UserRepository, useClass: TypeOrmUserRepository },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: UuidV7IdGenerator },
  ],
  exports: [UsersFacade],
})
export class UsersModule {}
```

## Tokens for ports

```ts
export enum UserBloomFilter {
  Emails = 'users.emails',
}

export class UsersEmailChecker {
  constructor(
    @Inject(bloomFilterToken(UserBloomFilter.Emails))
    private readonly emails: AsyncBloomFilter,
  ) {}
}
```

## Platform library modules

```ts
@Module({
  imports: [
    // The service's own configuration. Libraries bring their sections.
    ConfigModule.forRoot({ env: process.env }),

    ObservabilityModule.forRoot({ telemetry }),
    ResilienceModule.forRoot(),
    SchedulingModule.forRoot({
      mode: SchedulingMode.InProcess,
      logger: LoggerPort,
      metrics: MetricsPort,
    }),

    // Infrastructure adapters.
    ValkeyModule.forRoot({ connectionName: SERVICE_NAME }),
    AwsModule.forRoot({
      messaging: { topology: identityTopology, source: SERVICE_NAME },
    }),
    PersistenceModule.forRoot({
      shard: { entities: shardEntities, migrations: shardMigrations },
      catalog: {
        entities: platformCatalogEntities,
        migrations: platformCatalogMigrations,
      },
      shardLister: DirectoryShardLister,
    }),
    PostgresPlatformModule.forRoot(),

    // Core, with the adapter chosen by `Type<Port>`.
    ShardingModule.forRoot({
      routingCache: ValkeyRoutingCache,
      channel: ValkeyShardDirectoryChannel,
      directory: TypeOrmDirectoryStore,
    }),
    CacheModule.forRoot({ store: ValkeyCache, metrics: MetricsPort }),
    RateLimitModule.forRoot({
      limiter: ValkeyRateLimiter,
      degradeLocally: true,
    }),
    MessagingModule.forRoot({
      source: SERVICE_NAME,
      consumer: QueueName.Orders,
      topology: identityTopology,
      outboxStore: TypeOrmOutboxStore,
      processedStore: TypeOrmProcessedMessageStore,
      publisher: SnsSqsEnvelopePublisher,
      bus: SnsSqsMessageBus,
      relay: true, // registers OutboxRelayJob and the retention jobs
      relayScopes: ShardedRelayScopes,
    }),
    // Not global: destroyed before AwsModule, so polling stops before the clients close.
    SqsConsumerModule.forRoot({
      topology: identityTopology,
      queue: QueueName.Orders,
    }),
    InternalApiModule.forRoot({
      operations: identityOperations,
      transport: InternalTransportKind.Http,
      processedStore: TypeOrmIdempotencyStore,
    }),
    SagaPostgresModule,
    SagaModule.forRoot({
      store: TypeOrmSagaStore,
      scopes: ShardedSagaScopes,
    }),

    // Business modules.
    UsersModule,
  ],
})
export class AppModule {}
```

## Use cases and commands

```ts
@Injectable()
export class RegisterUserUseCase implements UseCase<
  RegisterUserCommand,
  RegisterUserResult
> {
  constructor(
    private readonly users: UserRepository,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    const email = Email.create(command.email);
    return this.transactions.runInTransaction(async () => {
      if (await this.users.findByEmail(email)) {
        throw new EmailAlreadyRegisteredError();
      }
      const user = User.register({
        id: this.ids.next(),
        email,
        now: this.clock.now(),
        eventId: this.ids.next(),
      });
      await this.users.save(user);
      await this.bus.publish(UserRegisteredV1, { userId: user.id.value });
      return { userId: user.id.value };
    });
  }
}
```
