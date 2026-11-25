# Platform library modules

What each module provides and which lifecycle hooks it implements.

- `ConfigModule`: provides: `AppConfig`
- `ObservabilityModule`: provides: `LoggerPort`, `MetricsPort`, `RequestContextStore`, `Tracing`, `Redactor`, `HealthRegistry`, `TELEMETRY`; hooks: `OnApplicationShutdown` (telemetry flush)
- `ResilienceModule`: provides: `ResilienceRegistry`; `forFeature({ name, policy })` adds a policy
- `CacheModule`: provides: `CachePort`, `SingleFlight`, `CacheAside` per namespace (`cacheAsideToken(namespace)`)
- `RateLimitModule`: provides: `RateLimiter`, `RateLimitGuard`
- `BloomModule`: provides: `bloomFilterToken(name)` via `forFeature`, `BloomRebuildJob`
- `SchedulingModule`: provides: `JobRunner`, `JobLock`; hooks: `OnApplicationBootstrap`, `BeforeApplicationShutdown`
- `ShardingModule`: provides: `ShardRouter`, `DirectoryChangeSubscription`; hooks: `OnModuleInit`, `OnModuleDestroy`
- `MessagingModule`: provides: `OutboxWriter`, `MessageBus`, `MessageDispatcher`, `OutboxRelay`, `MessagingExplorer`, jobs; hooks: `OnApplicationBootstrap` (consumer registration)
- `InternalApiModule`: provides: `InternalClient`, `InternalRouter`, `Transport`, `InternalApiController`, jobs; hooks: `OnApplicationBootstrap` (`assertComplete`)
- `PersistenceModule`: provides: `TransactionManager`, `EntityManagerProvider`, `ShardResolver`, `ShardScope`, `AcrossShards`; hooks: `OnModuleDestroy` (closes the `DataSource` instances)
- `PostgresPlatformModule`: provides: `TypeOrmOutboxStore`, `TypeOrmProcessedMessageStore`, `TypeOrmIdempotencyStore`, `TypeOrmDirectoryStore`
- `SagaModule`: provides: `Sagas`, `SagaEngine`, `SagaRecoveryJob`, `SagaRetentionJob`; `forFeature([definitions])`
- `AwsModule`: provides: `SNS_CLIENT`, `SQS_CLIENT`, `SnsSqsMessageBus`, `SnsSqsEnvelopePublisher`, `AwsMessagingNames`, `AwsErrorTranslator`; hooks: `OnModuleDestroy`
- `SqsConsumerModule`: provides: `SqsPoller`, `SqsDeliveryProcessor`, `SqsDeadLetterRedriver`; not global; hooks: `OnApplicationBootstrap`, `OnModuleDestroy`
- `ValkeyModule`: provides: `VALKEY_CLIENT`, `ValkeyCache`, `ValkeyRateLimiter`, `ValkeyRoutingCache`, `ValkeyShardDirectoryChannel`, `ValkeyBloomFilterFactory`, `ValkeyJobLock`, `ValkeyHealthIndicator`; hooks: `OnModuleDestroy` (`quit`)
