import { Global, Module } from '@nestjs/common';
import { ValkeyUsageCounterStore } from '../metering/valkey-usage-counter-store.js';
import { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';

/**
 * Contadores de uso sobre el cliente de `ValkeyModule`, para `MeteringModule.forRoot({ counters })`. Es
 * global porque `MeteringModule` los toma por su clase.
 */
@Global()
@Module({
  providers: [
    {
      provide: ValkeyUsageCounterStore,
      useFactory: (executor: ValkeyCommandExecutor, keyspace: ValkeyKeyspace) =>
        new ValkeyUsageCounterStore(executor, keyspace),
      inject: [ValkeyCommandExecutor, ValkeyKeyspace],
    },
  ],
  exports: [ValkeyUsageCounterStore],
})
export class ValkeyMeteringModule {}
