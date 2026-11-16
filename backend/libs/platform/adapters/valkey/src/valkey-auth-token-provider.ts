import type { ValkeyAuthRequest } from './valkey-auth-request.js';

/**
 * Entrega la contraseña de cada conexión nueva, por ejemplo el token IAM de
 * ElastiCache. Es un puerto de este adaptador: `ElastiCacheIamAuthTokenProvider`
 * de `@platform/adapters-aws` lo cumple por forma, así `valkey` no depende de `aws`.
 */
export abstract class ValkeyAuthTokenProvider {
  /** Token vigente para esa identidad. Se pide en cada conexión y reconexión, nunca se guarda. */
  abstract token(request: ValkeyAuthRequest): Promise<string>;
}
