import { FailureClassifier } from '@platform/primitives';
import {
  ResilienceRegistry,
  ResilienceRegistryFactory,
} from '@platform/resilience';
import { SystemClock, SystemRandomSource } from '@platform/kernel';
import { Global, Module } from '@nestjs/common';

/** Real resilience registry, available globally for the module tests. */
@Global()
@Module({
  providers: [
    {
      provide: ResilienceRegistry,
      useFactory: () =>
        new ResilienceRegistryFactory().create(
          {},
          {
            clock: new SystemClock(),
            random: new SystemRandomSource(),
            classifier: new FailureClassifier(),
          },
        ),
    },
  ],
  exports: [ResilienceRegistry],
})
export class ResilienceTestModule {}
