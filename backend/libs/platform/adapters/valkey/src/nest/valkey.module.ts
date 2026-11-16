import { Module, type DynamicModule } from '@nestjs/common';
import type {
  ValkeyModuleExtras,
  ValkeyModuleOptions,
} from './valkey-module-options.js';
import {
  ValkeyModuleClass,
  type ValkeyModuleAsyncOptions,
} from './valkey.module-definition.js';

/**
 * Cableado del adaptador de Valkey: cliente, ejecutor de comandos, espacio de
 * llaves y los adaptadores de cache, rate-limit, routing cache, canal de
 * cambios del directorio, filtros de Bloom y lock de jobs, más su indicador de
 * salud. Es global y cierra el cliente con `quit` en su `onModuleDestroy`:
 * Nest destruye los módulos globales al final y en orden inverso al de
 * importación, así los jobs y consumidores que usan Valkey ya se detuvieron.
 */
@Module({})
export class ValkeyModule extends ValkeyModuleClass {
  static override forRoot(
    options: ValkeyModuleOptions & Partial<ValkeyModuleExtras> = {},
  ): DynamicModule {
    return super.forRoot(options);
  }

  static override forRootAsync(
    options: ValkeyModuleAsyncOptions & Partial<ValkeyModuleExtras>,
  ): DynamicModule {
    return super.forRootAsync(options);
  }
}
