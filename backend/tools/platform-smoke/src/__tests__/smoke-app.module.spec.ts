import { ConfigModule } from '@platform/config/nest';
import { ObservabilityModule } from '@platform/observability/nest';
import { ResilienceModule } from '@platform/resilience/nest';
import { SchedulingModule } from '@platform/scheduling/nest';
import { ValkeyModule } from '@platform/adapters-valkey/nest';
import { AwsModule, SqsConsumerModule } from '@platform/adapters-aws/nest';
import {
  PostgresPlatformModule,
  SagaPostgresModule,
} from '@platform/adapters-postgres/nest';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardingModule } from '@platform/sharding/nest';
import { CacheModule } from '@platform/cache/nest';
import { RateLimitModule } from '@platform/rate-limit/nest';
import { MessagingModule } from '@platform/messaging/nest';
import { InternalApiModule } from '@platform/internal-api/nest';
import { SagaModule } from '@platform/saga/nest';
import { SmokeAppModule } from '../smoke-app.module.js';
import { SmokeOrdersModule } from '../orders/smoke-orders.module.js';
import { SmokeFailuresModule } from '../smoke-failures.module.js';
import { SmokeTenancyModule } from '../smoke-tenancy.module.js';
import { KernelModule } from '@platform/kernel/nest';

/** Modules of the reference composition, in import order. */
const EXPECTED_ORDER: readonly unknown[] = [
  ConfigModule,
  KernelModule,
  ObservabilityModule,
  ResilienceModule,
  SchedulingModule,
  ValkeyModule,
  AwsModule,
  PersistenceModule,
  PostgresPlatformModule,
  ShardingModule,
  CacheModule,
  RateLimitModule,
  MessagingModule,
  SqsConsumerModule,
  InternalApiModule,
  SagaPostgresModule,
  SagaModule,
  SmokeFailuresModule,
  SmokeTenancyModule,
  SmokeOrdersModule,
];

describe('SmokeAppModule', () => {
  it('imports every platform module in the order of the wiring guide', () => {
    const dynamic = SmokeAppModule.register({ env: {} });

    const imported = (dynamic.imports ?? []).map((entry) =>
      typeof entry === 'function'
        ? entry
        : (entry as { module: unknown }).module,
    );

    expect(imported).toEqual(EXPECTED_ORDER);
  });

  it('names itself as the module of the dynamic registration', () => {
    expect(SmokeAppModule.register({ env: {} }).module).toBe(SmokeAppModule);
  });
});
