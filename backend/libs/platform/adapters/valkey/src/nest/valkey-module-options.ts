import type { Abstract, Type } from '@nestjs/common';
import type { ValkeyAuthTokenProvider } from '../valkey-auth-token-provider.js';
import type { ValkeyRuntimeOptions } from '../valkey-runtime-options.js';

/** Options of `ValkeyModule`: what comes from the runtime and not from the environment. */
export type ValkeyModuleOptions = ValkeyRuntimeOptions;

/**
 * Adapters of `ValkeyModule`. They are passed as a type, not as an instance, and are
 * fixed when composing the module: they are the same in `forRoot` and in `forRootAsync`.
 */
export interface ValkeyModuleExtras {
  /**
   * Required with `VALKEY_AUTH` other than `none`: the provider of the IAM
   * token, for example `ElastiCacheIamAuthTokenProvider` from `@platform/adapters-aws`.
   */
  readonly authToken?:
    Type<ValkeyAuthTokenProvider> | Abstract<ValkeyAuthTokenProvider>;
}
