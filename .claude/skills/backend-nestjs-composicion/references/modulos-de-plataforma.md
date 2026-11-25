# Módulos de las librerías de plataforma

Qué provee cada módulo y qué hooks de ciclo de vida implementa.

- `ConfigModule`: provee: `AppConfig`
- `ObservabilityModule`: provee: `LoggerPort`, `MetricsPort`, `RequestContextStore`, `Tracing`, `Redactor`, `HealthRegistry`, `TELEMETRY`; hooks: `OnApplicationShutdown` (flush de telemetría)
- `ResilienceModule`: provee: `ResilienceRegistry`; `forFeature({ name, policy })` agrega una política
- `CacheModule`: provee: `CachePort`, `SingleFlight`, `CacheAside` por espacio (`cacheAsideToken(namespace)`)
- `RateLimitModule`: provee: `RateLimiter`, `RateLimitGuard`
- `BloomModule`: provee: `bloomFilterToken(name)` por `forFeature`, `BloomRebuildJob`
- `SchedulingModule`: provee: `JobRunner`, `JobLock`; hooks: `OnApplicationBootstrap`, `BeforeApplicationShutdown`
- `ShardingModule`: provee: `ShardRouter`, `DirectoryChangeSubscription`; hooks: `OnModuleInit`, `OnModuleDestroy`
- `MessagingModule`: provee: `OutboxWriter`, `MessageBus`, `MessageDispatcher`, `OutboxRelay`, `MessagingExplorer`, jobs; hooks: `OnApplicationBootstrap` (registro de consumidores)
- `InternalApiModule`: provee: `InternalClient`, `InternalRouter`, `Transport`, `InternalApiController`, jobs; hooks: `OnApplicationBootstrap` (`assertComplete`)
- `PersistenceModule`: provee: `TransactionManager`, `EntityManagerProvider`, `ShardResolver`, `ShardScope`, `AcrossShards`; hooks: `OnModuleDestroy` (cierra los `DataSource`)
- `PostgresPlatformModule`: provee: `TypeOrmOutboxStore`, `TypeOrmProcessedMessageStore`, `TypeOrmIdempotencyStore`, `TypeOrmDirectoryStore`
- `SagaModule`: provee: `Sagas`, `SagaEngine`, `SagaRecoveryJob`, `SagaRetentionJob`; `forFeature([definiciones])`
- `AwsModule`: provee: `SNS_CLIENT`, `SQS_CLIENT`, `SnsSqsMessageBus`, `SnsSqsEnvelopePublisher`, `AwsMessagingNames`, `AwsErrorTranslator`; hooks: `OnModuleDestroy`
- `SqsConsumerModule`: provee: `SqsPoller`, `SqsDeliveryProcessor`, `SqsDeadLetterRedriver`; no es global; hooks: `OnApplicationBootstrap`, `OnModuleDestroy`
- `ValkeyModule`: provee: `VALKEY_CLIENT`, `ValkeyCache`, `ValkeyRateLimiter`, `ValkeyRoutingCache`, `ValkeyShardDirectoryChannel`, `ValkeyBloomFilterFactory`, `ValkeyJobLock`, `ValkeyHealthIndicator`; hooks: `OnModuleDestroy` (`quit`)
