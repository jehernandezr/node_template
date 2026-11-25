import type { ValkeyAuthRequest } from './valkey-auth-request.js';

/**
 * Provides the password of each new connection, for example the ElastiCache
 * IAM token. It is a port of this adapter: `ElastiCacheIamAuthTokenProvider`
 * from `@platform/adapters-aws` satisfies it structurally, so `valkey` does not depend on `aws`.
 */
export abstract class ValkeyAuthTokenProvider {
  /** Returns the current token for that identity. It is requested on each connection and reconnection, never stored. */
  abstract token(request: ValkeyAuthRequest): Promise<string>;
}
