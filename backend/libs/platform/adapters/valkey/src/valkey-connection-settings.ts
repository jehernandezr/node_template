import type { ValkeyConnectionOptions } from './valkey-connection-options.js';
import type { ValkeyTokenAuth } from './valkey-token-auth.js';

/** Datos de conexión resueltos desde la configuración. */
export interface ValkeyConnectionSettings {
  readonly connection: ValkeyConnectionOptions;
  /** Presente con un modo IAM: cada conexión se autentica con un token nuevo. */
  readonly auth?: ValkeyTokenAuth;
}
