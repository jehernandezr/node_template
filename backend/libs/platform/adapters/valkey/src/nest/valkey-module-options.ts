import type { Abstract, Type } from '@nestjs/common';
import type { ValkeyAuthTokenProvider } from '../valkey-auth-token-provider.js';
import type { ValkeyRuntimeOptions } from '../valkey-runtime-options.js';

/** Opciones de `ValkeyModule`: lo que viene del runtime y no del entorno. */
export type ValkeyModuleOptions = ValkeyRuntimeOptions;

/**
 * Adaptadores de `ValkeyModule`. Se pasan como tipo, no como instancia, y se
 * fijan al componer el módulo: van igual en `forRoot` y en `forRootAsync`.
 */
export interface ValkeyModuleExtras {
  /**
   * Obligatorio con `VALKEY_AUTH` distinto de `none`: quien entrega el token
   * IAM, por ejemplo `ElastiCacheIamAuthTokenProvider` de `@platform/adapters-aws`.
   */
  readonly authToken?:
    Type<ValkeyAuthTokenProvider> | Abstract<ValkeyAuthTokenProvider>;
}
