import { Global, Module } from '@nestjs/common';
import { ValkeyUsageCounterStore } from '../metering/valkey-usage-counter-store.js';
import { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';

/**
 * Usage counters on the `ValkeyModule` client, for `MeteringModule.forRoot({ counters })`. It is
 * global because `MeteringModule` takes them by their class.
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
