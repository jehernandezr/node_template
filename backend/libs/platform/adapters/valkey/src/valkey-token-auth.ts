import type { ValkeyAuthRequest } from './valkey-auth-request.js';
import type { ValkeyAuthTokenProvider } from './valkey-auth-token-provider.js';

/** Autenticación por token: quién lo entrega y para qué identidad. */
export interface ValkeyTokenAuth {
  readonly provider: ValkeyAuthTokenProvider;
  readonly request: ValkeyAuthRequest;
}
