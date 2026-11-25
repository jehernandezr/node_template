import type { ValkeyAuthRequest } from './valkey-auth-request.js';
import type { ValkeyAuthTokenProvider } from './valkey-auth-token-provider.js';

/** Token authentication: who provides it and for which identity. */
export interface ValkeyTokenAuth {
  readonly provider: ValkeyAuthTokenProvider;
  readonly request: ValkeyAuthRequest;
}
