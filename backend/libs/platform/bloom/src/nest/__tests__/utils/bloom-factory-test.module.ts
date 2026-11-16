import { Global, Module } from '@nestjs/common';
import { CountingBloomFilterFactory } from './counting-bloom-filter-factory.js';

/** Fábrica de prueba disponible de forma global, para que `BloomModule.forRoot` la inyecte por clase. */
@Global()
@Module({
  providers: [CountingBloomFilterFactory],
  exports: [CountingBloomFilterFactory],
})
export class BloomFactoryTestModule {}
