import { Module, type DynamicModule } from '@nestjs/common';
import {
  ValkeyCache,
  ValkeyRateLimiter,
  ValkeyRoutingCache,
  ValkeyShardDirectoryChannel,
} from '@platform/adapters-valkey';
import { ValkeyModule } from '@platform/adapters-valkey/nest';
import {
  SnsSqsEnvelopePublisher,
  SnsSqsMessageBus,
} from '@platform/adapters-aws';
import { AwsModule, SqsConsumerModule } from '@platform/adapters-aws/nest';
import {
  DirectoryShardLister,
  platformCatalogEntities,
  platformCatalogMigrations,
  platformSagaShardEntities,
  platformSagaShardMigrations,
  platformShardEntities,
  platformShardMigrations,
  ShardedRelayScopes,
  TypeOrmDirectoryStore,
  TypeOrmIdempotencyStore,
  TypeOrmOutboxStore,
  TypeOrmProcessedMessageStore,
  TypeOrmSagaStore,
  ShardedSagaScopes,
} from '@platform/adapters-postgres';
import {
  PostgresPlatformModule,
  SagaPostgresModule,
} from '@platform/adapters-postgres/nest';
import { ConfigModule } from '@platform/config/nest';
import { LoggerPort, MetricsPort } from '@platform/observability';
import { ObservabilityModule } from '@platform/observability/nest';
import { PersistenceModule } from '@platform/persistence/nest';
import { ResilienceModule } from '@platform/resilience/nest';
import { SchedulingMode } from '@platform/scheduling';
import { SchedulingModule } from '@platform/scheduling/nest';
import { ShardingModule } from '@platform/sharding/nest';
import { CacheModule } from '@platform/cache/nest';
import { RateLimitModule } from '@platform/rate-limit/nest';
import { MessagingModule } from '@platform/messaging/nest';
import {
  InternalApiModule,
  InternalTransportKind,
} from '@platform/internal-api/nest';
import { SagaModule } from '@platform/saga/nest';
import { SmokeOrdersModule } from './orders/smoke-orders.module.js';
import { SmokeOperations } from './orders/smoke-operations.js';
import { SmokeQueue } from './orders/smoke-queue.enum.js';
import { SmokeTopology } from './orders/smoke-topology.js';
import { SmokeTenantVerifier } from './orders/smoke-tenant-verifier.js';
import { SmokeOrderEntity } from './orders/smoke-order.entity.js';
import { CreateSmokeOrdersMigration } from './orders/create-smoke-orders.migration.js';
import { SmokeService } from './smoke-service.enum.js';
import { SmokeTenancyModule } from './smoke-tenancy.module.js';
import { SmokeKernelModule } from './smoke-kernel.module.js';
import type { SmokeEnvironment } from './smoke-environment.js';

/**
 * Composición de referencia de un servicio: el `AppModule` de la guía de cableado con todos los módulos de
 * librería, compilado. Lo arma `register` con el entorno que valida la configuración.
 */
@Module({})
export class SmokeAppModule {
  static register(environment: SmokeEnvironment): DynamicModule {
    return {
      module: SmokeAppModule,
      imports: [
        ConfigModule.forRoot({ env: environment.env }),
        SmokeKernelModule,
        ObservabilityModule.forRoot({ telemetry: environment.telemetry }),
        ResilienceModule.forRoot(),
        SchedulingModule.forRoot({
          mode: SchedulingMode.InProcess,
          logger: LoggerPort,
          metrics: MetricsPort,
        }),
        ValkeyModule.forRoot({ connectionName: SmokeService.Name }),
        AwsModule.forRoot({
          messaging: {
            topology: SmokeTopology.topology,
            source: SmokeService.Name,
          },
        }),
        PersistenceModule.forRoot({
          shard: {
            entities: [
              ...platformShardEntities,
              ...platformSagaShardEntities,
              SmokeOrderEntity,
            ],
            migrations: [
              ...platformShardMigrations,
              ...platformSagaShardMigrations,
              CreateSmokeOrdersMigration,
            ],
          },
          catalog: {
            entities: platformCatalogEntities,
            migrations: platformCatalogMigrations,
          },
          shardLister: DirectoryShardLister,
        }),
        PostgresPlatformModule.forRoot(),
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
          source: SmokeService.Name,
          consumer: SmokeQueue.Orders,
          topology: SmokeTopology.topology,
          outboxStore: TypeOrmOutboxStore,
          processedStore: TypeOrmProcessedMessageStore,
          publisher: SnsSqsEnvelopePublisher,
          bus: SnsSqsMessageBus,
          relay: true,
          relayScopes: ShardedRelayScopes,
          tenantVerifier: SmokeTenantVerifier,
        }),
        SqsConsumerModule.forRoot({
          topology: SmokeTopology.topology,
          queue: SmokeQueue.Orders,
        }),
        InternalApiModule.forRoot({
          operations: SmokeOperations.all,
          transport: InternalTransportKind.InProcess,
          processedStore: TypeOrmIdempotencyStore,
        }),
        SagaPostgresModule,
        SagaModule.forRoot({
          store: TypeOrmSagaStore,
          scopes: ShardedSagaScopes,
        }),
        SmokeTenancyModule,
        SmokeOrdersModule,
      ],
    };
  }
}
