import type { ValkeyConnectionOptions } from './valkey-connection-options.js';
import type { ValkeyTokenAuth } from './valkey-token-auth.js';

/** Connection data resolved from the configuration. */
export interface ValkeyConnectionSettings {
  readonly connection: ValkeyConnectionOptions;
  /** Present with an IAM mode: each connection authenticates with a new token. */
  readonly auth?: ValkeyTokenAuth;
}
