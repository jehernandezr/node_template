import { Global, Module } from '@nestjs/common';
import { CountingBloomFilterFactory } from './counting-bloom-filter-factory.js';

/** Test factory available globally, so `BloomModule.forRoot` injects it by class. */
@Global()
@Module({
  providers: [CountingBloomFilterFactory],
  exports: [CountingBloomFilterFactory],
})
export class BloomFactoryTestModule {}
