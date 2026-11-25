import { Module } from '@nestjs/common';
import { Clock, IdGenerator } from '@platform/kernel';
import { EnvelopeFactory } from '@platform/messaging';
import { CacheModule } from '@platform/cache/nest';
import { PersistenceModule } from '@platform/persistence/nest';
import { SagaModule } from '@platform/saga/nest';
import { ShardKey } from '@platform/sharding';
import { ChangeSmokeOrderStatus } from './change-smoke-order-status.js';
import { RegisterSmokeOrder } from './register-smoke-order.js';
import { SmokeCacheNamespace } from './smoke-cache-namespace.enum.js';
import { SmokeOrderCache } from './smoke-order-cache.js';
import { SmokeOrderConsumer } from './smoke-order-consumer.js';
import { SmokeOrderEntity } from './smoke-order.entity.js';
import { SmokeOrderLedger } from './smoke-order-ledger.js';
import { SmokeOrderMapper } from './smoke-order.mapper.js';
import { SmokeOrderRepository } from './smoke-order.repository.js';
import { SmokeStockHandlers } from './smoke-stock-handlers.js';
import { SmokeWelcomeSaga } from './smoke-welcome-saga.js';

/** Business module of the test: its per-tenant table, its cache, its saga and its pieces. */
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [SmokeOrderEntity],
      sharding: { key: ShardKey.Tenant },
    }),
    CacheModule.forFeature({ namespace: SmokeCacheNamespace.Orders }),
    SagaModule.forFeature([SmokeWelcomeSaga]),
  ],
  providers: [
    SmokeOrderMapper,
    SmokeOrderRepository,
    {
      provide: EnvelopeFactory,
      useFactory: (clock: Clock, ids: IdGenerator) =>
        new EnvelopeFactory(clock, ids),
      inject: [Clock, IdGenerator],
    },
    RegisterSmokeOrder,
    ChangeSmokeOrderStatus,
    SmokeOrderCache,
    SmokeOrderConsumer,
    SmokeOrderLedger,
    SmokeStockHandlers,
  ],
  exports: [
    RegisterSmokeOrder,
    ChangeSmokeOrderStatus,
    SmokeOrderCache,
    SmokeOrderLedger,
    SmokeOrderRepository,
    SmokeStockHandlers,
  ],
})
export class SmokeOrdersModule {}
