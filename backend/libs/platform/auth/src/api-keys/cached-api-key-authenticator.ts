import { ActorType } from '@platform/observability';
import type { Clock } from '@platform/kernel';
import type { ServiceAccountActor } from '../actor/actor.js';
import { AuthenticationError } from '../errors/authentication.error.js';
import type { AuthStateReader } from '../state/auth-state-reader.js';
import type { ApiKeyPrincipal } from './api-key-principal.js';
import { ApiKeyAuthenticator } from './api-key-authenticator.js';
import { ApiKeyFormat } from './api-key-format.js';
import type { ApiKeyResolver } from './api-key-resolver.js';

/**
 * Autentica con la copia compartida `auth:apikey:{prefix}` y, si no está, con
 * el `ApiKeyResolver`. Identity es quien llena esa copia; este servicio solo la lee.
 */
export class CachedApiKeyAuthenticator extends ApiKeyAuthenticator {
  constructor(
    private readonly state: AuthStateReader,
    private readonly resolver: ApiKeyResolver,
    private readonly clock: Clock,
  ) {
    super();
  }

  async authenticate(rawKey: string): Promise<ServiceAccountActor> {
    const parsed = ApiKeyFormat.parse(rawKey);
    if (parsed === undefined) {
      throw AuthenticationError.unauthenticated('malformed api key');
    }
    const hash = ApiKeyFormat.hashSecret(parsed.secret);

    let principal: ApiKeyPrincipal | undefined;
    try {
      principal = await this.state.apiKey(parsed.prefix, hash);
    } catch {
      // La copia en Valkey no es la fuente de verdad: si no responde, el resolutor decide.
      principal = undefined;
    }
    if (principal === undefined) {
      try {
        principal = await this.resolver.resolve(parsed.prefix, hash);
      } catch (error) {
        if (error instanceof AuthenticationError) {
          throw error;
        }
        throw AuthenticationError.stateUnavailable(error);
      }
    }
    if (principal === undefined) {
      throw AuthenticationError.unauthenticated('unknown api key');
    }
    if (principal.environment !== parsed.environment) {
      throw AuthenticationError.unauthenticated('environment mismatch');
    }
    if (
      principal.expiresAt !== undefined &&
      principal.expiresAt * 1000 <= this.clock.now().getTime()
    ) {
      throw AuthenticationError.unauthenticated('api key expired');
    }

    return {
      kind: ActorType.ServiceAccount,
      serviceAccountId: principal.serviceAccountId,
      apiKeyId: principal.apiKeyId,
      tenantId: principal.tenantId,
      permissions: principal.permissions,
    };
  }
}
