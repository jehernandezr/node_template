import { SystemClock, SystemRandomSource } from '@platform/kernel';
import { Global, Module } from '@nestjs/common';
import { ResilienceRegistry } from '@platform/resilience';

/** Real resilience registry, available globally for the module tests. */
@Global()
@Module({
  providers: [
    {
      provide: ResilienceRegistry,
      useFactory: () =>
        new ResilienceRegistry(
          {},
          { clock: new SystemClock(), random: new SystemRandomSource() },
        ),
    },
  ],
  exports: [ResilienceRegistry],
})
export class ResilienceTestModule {}
