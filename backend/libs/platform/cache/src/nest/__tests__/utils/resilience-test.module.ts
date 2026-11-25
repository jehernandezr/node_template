import { Global, Module } from '@nestjs/common';
import { ResilienceRegistry } from '@platform/resilience';

/** Real resilience registry, available globally for the module tests. */
@Global()
@Module({
  providers: [
    { provide: ResilienceRegistry, useFactory: () => new ResilienceRegistry() },
  ],
  exports: [ResilienceRegistry],
})
export class ResilienceTestModule {}
