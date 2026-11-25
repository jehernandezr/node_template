# Ejemplos de backend-nestjs-composicion

Ejemplos largos que la skill cita. Léelos solo cuando el tema te toque.

## Tokens para puertos

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

## Tokens para puertos

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

## Módulos de las librerías de plataforma

```ts
@Module({
  imports: [
    // Configuración propia del servicio. Las librerías traen sus secciones.
    ConfigModule.forRoot({ env: process.env }),

    ObservabilityModule.forRoot({ telemetry }),
    ResilienceModule.forRoot(),
    SchedulingModule.forRoot({
      mode: SchedulingMode.InProcess,
      logger: LoggerPort,
      metrics: MetricsPort,
    }),

    // Adaptadores de infraestructura.
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

    // Núcleo, con el adaptador elegido por `Type<Port>`.
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
      relay: true, // registra OutboxRelayJob y las retenciones
      relayScopes: ShardedRelayScopes,
    }),
    // No es global: se destruye antes que AwsModule y detiene el sondeo antes de cerrar los clientes.
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

    // Módulos de negocio.
    UsersModule,
  ],
})
export class AppModule {}
```

## Casos de uso y comandos

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
